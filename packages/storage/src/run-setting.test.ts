import type { RunSetting } from "@perstack/core"
import { describe, expect, it, vi } from "vitest"
import { defaultGetRunDir, type FileSystem, storeRunSetting } from "./run-setting.js"

describe("@perstack/storage: defaultGetRunDir", () => {
  it("returns correct run directory path", () => {
    const jobId = "test-job-123"
    const runId = "test-run-123"
    const expected = `${process.cwd()}/perstack/jobs/${jobId}/runs/${runId}`
    expect(defaultGetRunDir(jobId, runId)).toBe(expected)
  })

  it("handles special characters in runId", () => {
    const jobId = "test-job-456"
    const runId = "test-run_with.special-chars"
    const expected = `${process.cwd()}/perstack/jobs/${jobId}/runs/${runId}`
    expect(defaultGetRunDir(jobId, runId)).toBe(expected)
  })

  it("returns path relative to current working directory", () => {
    const jobId = "job123"
    const runId = "abc123"
    const result = defaultGetRunDir(jobId, runId)
    expect(result).toContain("/perstack/jobs/")
    expect(result.endsWith(runId)).toBe(true)
  })
})

describe("@perstack/storage: storeRunSetting", () => {
  const baseSetting: RunSetting = {
    jobId: "job-123",
    runId: "run-123",
    model: "claude-sonnet-4-20250514",
    providerConfig: { providerName: "anthropic", apiKey: "test-key" },
    expertKey: "test-expert",
    input: { text: "hello" },
    experts: {},
    temperature: 0.7,
    maxSteps: 100,
    maxRetries: 3,
    timeout: 30000,
    startedAt: 1000,
    updatedAt: 2000,
    perstackApiBaseUrl: "https://api.perstack.dev",
    env: {},
  }
  const createMockFs = (existsResult: boolean): FileSystem => ({
    existsSync: vi.fn().mockReturnValue(existsResult),
    mkdir: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue(JSON.stringify(baseSetting)),
    writeFile: vi.fn().mockResolvedValue(undefined),
  })
  const mockGetRunDir = vi.fn().mockReturnValue("/mock/runs/run-123")

  it("creates directory and writes setting when directory does not exist", async () => {
    const fs = createMockFs(false)
    await storeRunSetting(baseSetting, fs, mockGetRunDir)
    expect(fs.existsSync).toHaveBeenCalledWith("/mock/runs/run-123")
    expect(fs.mkdir).toHaveBeenCalledWith("/mock/runs/run-123", { recursive: true })
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("run-setting.json"),
      JSON.stringify(baseSetting),
      "utf-8",
    )
    expect(fs.readFile).not.toHaveBeenCalled()
  })

  it("reads and updates setting when directory exists", async () => {
    const fs = createMockFs(true)
    const beforeTime = Date.now()
    await storeRunSetting(baseSetting, fs, mockGetRunDir)
    const afterTime = Date.now()
    expect(fs.existsSync).toHaveBeenCalledWith("/mock/runs/run-123")
    expect(fs.mkdir).not.toHaveBeenCalled()
    expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining("run-setting.json"), "utf-8")
    expect(fs.writeFile).toHaveBeenCalled()
    const writtenData = JSON.parse((fs.writeFile as ReturnType<typeof vi.fn>).mock.calls[0][1])
    expect(writtenData.updatedAt).toBeGreaterThanOrEqual(beforeTime)
    expect(writtenData.updatedAt).toBeLessThanOrEqual(afterTime)
  })

  it("preserves original setting data when updating", async () => {
    const originalSetting = { ...baseSetting, temperature: 0.5 }
    const fs = createMockFs(true)
    fs.readFile = vi.fn().mockResolvedValue(JSON.stringify(originalSetting))
    await storeRunSetting(baseSetting, fs, mockGetRunDir)
    const writtenData = JSON.parse((fs.writeFile as ReturnType<typeof vi.fn>).mock.calls[0][1])
    expect(writtenData.temperature).toBe(0.5)
  })
})
