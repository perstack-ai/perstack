import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { getRunDir, run } from "./runtime.js"

describe("@perstack/runtime: getRunDir", () => {
  it("returns correct run directory path", () => {
    const runId = "test-run-123"
    const expected = `${process.cwd()}/perstack/runs/${runId}`
    expect(getRunDir(runId)).toBe(expected)
  })

  it("handles special characters in runId", () => {
    const runId = "test-run_with.special-chars"
    const expected = `${process.cwd()}/perstack/runs/${runId}`
    expect(getRunDir(runId)).toBe(expected)
  })

  it("returns path relative to current working directory", () => {
    const runId = "abc123"
    const result = getRunDir(runId)
    expect(result).toContain("/perstack/runs/")
    expect(result.endsWith(runId)).toBe(true)
  })
})

describe("@perstack/runtime: run validation", () => {
  it("throws error for invalid workspace path", async () => {
    const invalidInput = {
      setting: {
        runId: "test-run",
        expertKey: "test-expert",
        experts: {
          "test-expert": {
            key: "test-expert",
            name: "test-expert",
            version: "1.0.0",
            instruction: "Test",
            skills: {},
            delegates: [],
            tags: [],
          },
        },
        input: { text: "Hello" },
        model: "claude-sonnet-4-20250514",
        providerConfig: { providerName: "anthropic" as const, apiKey: "test-key" },
        temperature: 0.7,
        maxSteps: 10,
        maxRetries: 3,
        timeout: 30000,
        workspace: "relative/path",
      },
    }
    await expect(run(invalidInput)).rejects.toThrow("Workspace path must be absolute")
  })
})

