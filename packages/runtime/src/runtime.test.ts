import { describe, expect, it } from "vitest"
import { getRunDir } from "./runtime.js"

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

