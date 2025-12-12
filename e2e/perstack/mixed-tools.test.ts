import { beforeAll, describe, expect, it } from "vitest"
import {
  assertCheckpointState,
  assertEventSequenceContains,
  assertPartialResultsContain,
  assertToolCallCount,
} from "../lib/assertions.js"
import type { ToolCallInfo } from "../lib/event-parser.js"
import { type RunResult, runExpert } from "../lib/runner.js"

describe("Mixed Tool Calls (MCP + Delegate + Interactive)", () => {
  let result: RunResult

  beforeAll(async () => {
    result = await runExpert(
      "e2e-mixed-tools",
      "Test mixed tool calls: search, delegate, and ask user",
      {
        configPath: "./e2e/experts/mixed-tools.toml",
        timeout: 180000,
      },
    )
  }, 200000)

  it("should generate 3 tool calls in priority order", () => {
    expect(assertToolCallCount(result.events, "callTools", 3).passed).toBe(true)
    expect(
      assertEventSequenceContains(result.events, [
        "startRun",
        "callTools",
        "callDelegate",
        "stopRunByDelegate",
      ]).passed,
    ).toBe(true)
  })

  it("should collect MCP result before delegate", () => {
    const checkResult = assertCheckpointState(result.events, "stopRunByDelegate", {
      status: "stoppedByDelegate",
      partialToolResults: [{}] as ToolCallInfo[],
      pendingToolCalls: [{}] as ToolCallInfo[],
    })
    expect(checkResult.passed).toBe(true)
    expect(
      assertPartialResultsContain(result.events, "stopRunByDelegate", ["web_search_exa"]).passed,
    ).toBe(true)
  })

  it("should resume with delegate result and process interactive", () => {
    expect(
      assertEventSequenceContains(result.events, [
        "stopRunByDelegate",
        "startRun",
        "completeRun",
        "startRun",
        "resumeToolCalls",
        "callInteractiveTool",
        "stopRunByInteractiveTool",
      ]).passed,
    ).toBe(true)
  })

  it("should have all partial results after interactive stop", () => {
    const checkResult = assertCheckpointState(result.events, "stopRunByInteractiveTool", {
      status: "stoppedByInteractiveTool",
      partialToolResults: [{}, {}] as ToolCallInfo[],
      pendingToolCalls: [{}] as ToolCallInfo[],
    })
    expect(checkResult.passed).toBe(true)
  })
})
