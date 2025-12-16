import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  QuietBuildStrategy,
  selectBuildStrategy,
  VerboseBuildStrategy,
  VerboseProgressBuildStrategy,
} from "./build-strategy.js"
import { createEventCollector, createMockProcess, createMockProcessFactory } from "./test-utils.js"

describe("selectBuildStrategy", () => {
  it("should return QuietBuildStrategy when verbose is false", () => {
    const strategy = selectBuildStrategy(false, true, true)
    expect(strategy).toBeInstanceOf(QuietBuildStrategy)
  })

  it("should return VerboseBuildStrategy when verbose but no eventListener", () => {
    const strategy = selectBuildStrategy(true, false, true)
    expect(strategy).toBeInstanceOf(VerboseBuildStrategy)
  })

  it("should return VerboseBuildStrategy when verbose but no jobId/runId", () => {
    const strategy = selectBuildStrategy(true, true, false)
    expect(strategy).toBeInstanceOf(VerboseBuildStrategy)
  })

  it("should return VerboseProgressBuildStrategy when all conditions met", () => {
    const strategy = selectBuildStrategy(true, true, true)
    expect(strategy).toBeInstanceOf(VerboseProgressBuildStrategy)
  })
})

describe("QuietBuildStrategy", () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "build-strategy-test-"))
    fs.writeFileSync(path.join(tempDir, "docker-compose.yml"), "version: '3'")
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it("should call execCommand with correct args", async () => {
    const strategy = new QuietBuildStrategy()
    const execCommand = vi.fn(async () => ({ stdout: "", stderr: "", exitCode: 0 }))
    const processFactory = vi.fn()

    await strategy.build({ buildDir: tempDir }, execCommand, processFactory)

    expect(execCommand).toHaveBeenCalledWith([
      "docker",
      "compose",
      "-f",
      path.join(tempDir, "docker-compose.yml"),
      "build",
    ])
  })

  it("should throw error when build fails", async () => {
    const strategy = new QuietBuildStrategy()
    const execCommand = vi.fn(async () => ({ stdout: "", stderr: "error", exitCode: 1 }))
    const processFactory = vi.fn()

    await expect(
      strategy.build({ buildDir: tempDir }, execCommand, processFactory),
    ).rejects.toThrow("Docker build failed: error")
  })
})

describe("VerboseProgressBuildStrategy", () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "build-strategy-test-"))
    fs.writeFileSync(path.join(tempDir, "docker-compose.yml"), "version: '3'")
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it("should emit dockerBuildProgress events", async () => {
    const strategy = new VerboseProgressBuildStrategy()
    const { events, listener } = createEventCollector()
    const mockProc = createMockProcess()
    const processFactory = createMockProcessFactory(() => mockProc)

    const buildPromise = strategy.build(
      { buildDir: tempDir, jobId: "job-1", runId: "run-1", eventListener: listener },
      vi.fn(),
      processFactory,
    )

    mockProc.stdout.emit("data", Buffer.from("#5 [runtime 1/5] FROM node:22-slim\n"))
    mockProc.emit("close", 0)

    await buildPromise

    const progressEvents = events.filter((e) => e.type === "dockerBuildProgress")
    expect(progressEvents.length).toBeGreaterThan(0)
  })

  it("should throw error when missing required context", async () => {
    const strategy = new VerboseProgressBuildStrategy()

    await expect(strategy.build({ buildDir: tempDir }, vi.fn(), vi.fn())).rejects.toThrow(
      "VerboseProgressBuildStrategy requires jobId, runId, and eventListener",
    )
  })
})
