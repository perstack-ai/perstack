import type { AdapterRunParams } from "@perstack/core"
import { describe, expect, it } from "vitest"
import { buildCliArgs } from "./cli-builder.js"

describe("buildCliArgs", () => {
  const baseSetting: AdapterRunParams["setting"] = {
    input: { text: "test prompt" },
  }

  it("should build minimal args with defaults", () => {
    const args = buildCliArgs(baseSetting)
    expect(args).toEqual(["--max-steps", "100", "test prompt"])
  })

  it("should include jobId and runId when provided", () => {
    const args = buildCliArgs({
      ...baseSetting,
      jobId: "job-123",
      runId: "run-456",
    })
    expect(args).toContain("--job-id")
    expect(args).toContain("job-123")
    expect(args).toContain("--run-id")
    expect(args).toContain("run-456")
  })

  it("should include model when provided", () => {
    const args = buildCliArgs({
      ...baseSetting,
      model: "claude-sonnet-4-20250514",
    })
    expect(args).toContain("--model")
    expect(args).toContain("claude-sonnet-4-20250514")
  })

  it("should use provided maxSteps instead of default", () => {
    const args = buildCliArgs({
      ...baseSetting,
      maxSteps: 50,
    })
    expect(args).toContain("--max-steps")
    expect(args).toContain("50")
    expect(args).not.toContain("100")
  })

  it("should include optional numeric parameters", () => {
    const args = buildCliArgs({
      ...baseSetting,
      maxRetries: 3,
      timeout: 60000,
      temperature: 0.7,
    })
    expect(args).toContain("--max-retries")
    expect(args).toContain("3")
    expect(args).toContain("--timeout")
    expect(args).toContain("60000")
    expect(args).toContain("--temperature")
    expect(args).toContain("0.7")
  })

  it("should handle interactiveToolCallResult with -i flag", () => {
    const toolCallResult = { toolId: "test", result: "success" }
    const args = buildCliArgs({
      ...baseSetting,
      input: { interactiveToolCallResult: toolCallResult },
    })
    expect(args).toContain("-i")
    expect(args).toContain(JSON.stringify(toolCallResult))
    expect(args).not.toContain("test prompt")
  })

  it("should use empty string when text is undefined", () => {
    const args = buildCliArgs({
      ...baseSetting,
      input: {},
    })
    expect(args[args.length - 1]).toBe("")
  })

  it("should build full args with all options", () => {
    const args = buildCliArgs({
      jobId: "job-1",
      runId: "run-1",
      model: "claude-sonnet-4-20250514",
      maxSteps: 200,
      maxRetries: 5,
      timeout: 120000,
      temperature: 0.5,
      input: { text: "complex prompt" },
    })
    expect(args).toEqual([
      "--job-id",
      "job-1",
      "--run-id",
      "run-1",
      "--model",
      "claude-sonnet-4-20250514",
      "--max-steps",
      "200",
      "--max-retries",
      "5",
      "--timeout",
      "120000",
      "--temperature",
      "0.5",
      "complex prompt",
    ])
  })
})
