/**
 * Interactive Input E2E Tests
 *
 * Tests mixed tool call handling with multiple tool types in one response:
 * - MCP tools (web_search_exa) execute first
 * - Delegate tools suspend run (stopRunByDelegate)
 * - Interactive tools suspend run (stopRunByInteractiveTool)
 *
 * TOML: e2e/experts/mixed-tools.toml
 */
import { describe, expect, it } from "vitest"
import {
  assertCheckpointState,
  assertEventSequenceContains,
  assertPartialResultsContain,
  assertToolCallCount,
} from "../lib/assertions.js"
import type { ToolCallInfo } from "../lib/event-parser.js"
import { runCli, withEventParsing } from "../lib/runner.js"

const CONFIG = "./e2e/experts/mixed-tools.toml"
// LLM API calls require extended timeout beyond the default 30s
const LLM_TIMEOUT = 180000

describe("Interactive Input", () => {
  /**
   * Verifies mixed tool call processing order and checkpoint states.
   * Expert calls 3 tools in parallel: web_search_exa, e2e-helper, askUser.
   */
  it("should handle mixed tool calls with delegate and interactive stop", async () => {
    const cmdResult = await runCli(
      [
        "run",
        "--config",
        CONFIG,
        "--runtime",
        "local",
        "e2e-mixed-tools",
        "Test mixed tool calls: search, delegate, and ask user",
      ],
      { timeout: LLM_TIMEOUT },
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
  })
})
