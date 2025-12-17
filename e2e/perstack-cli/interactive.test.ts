import { describe, expect, it } from "vitest"
import {
  assertCheckpointState,
  assertEventSequenceContains,
  assertPartialResultsContain,
  assertToolCallCount,
} from "../lib/assertions.js"
import type { ToolCallInfo } from "../lib/event-parser.js"
import { runCli, withEventParsing } from "../lib/runner.js"

describe("Interactive Input", () => {
  it("should handle mixed tool calls with delegate and interactive stop", async () => {
    const cmdResult = await runCli(
      [
        "run",
        "--config",
        "./e2e/experts/mixed-tools.toml",
        "--runtime",
        "local",
        "e2e-mixed-tools",
        "Test mixed tool calls: search, delegate, and ask user",
      ],
      { timeout: 180000 },
    )
    const result = withEventParsing(cmdResult)

    expect(assertToolCallCount(result.events, "callTools", 3).passed).toBe(true)
    expect(
      assertEventSequenceContains(result.events, [
        "startRun",
        "callTools",
        "callDelegate",
        "stopRunByDelegate",
      ]).passed,
    ).toBe(true)

    expect(
      assertPartialResultsContain(result.events, "stopRunByDelegate", ["web_search_exa"]).passed,
    ).toBe(true)

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

    const checkResult = assertCheckpointState(result.events, "stopRunByInteractiveTool", {
      status: "stoppedByInteractiveTool",
      partialToolResults: [{}, {}] as ToolCallInfo[],
      pendingToolCalls: [{}] as ToolCallInfo[],
    })
    expect(checkResult.passed).toBe(true)
  }, 200000)
})
