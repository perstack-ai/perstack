import { beforeAll, describe, expect, it } from "vitest"
import {
  assertCheckpointState,
  assertEventSequenceContains,
  assertPartialResultsContain,
  assertToolCallCount,
} from "../lib/assertions.js"
import type { ToolCallInfo } from "../lib/event-parser.js"
import { type RunResult, runExpert } from "../lib/runner.js"

describe("Interactive Input", () => {
  describe("Mixed tools with interactive", () => {
    let result: RunResult

    beforeAll(async () => {
      result = await runExpert(
        "e2e-mixed-tools",
        "Test mixed tool calls: search, delegate, and ask user",
        { configPath: "./e2e/experts/mixed-tools.toml", timeout: 180000 },
      )
    }, 200000)

    it("should execute MCP tool before delegate", () => {
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

    it("should collect partial results before stopping", () => {
      expect(
        assertPartialResultsContain(result.events, "stopRunByDelegate", ["web_search_exa"]).passed,
      ).toBe(true)
    })

    it("should resume and stop at interactive tool", () => {
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

    it("should have all partial results when stopped", () => {
      const checkResult = assertCheckpointState(result.events, "stopRunByInteractiveTool", {
        status: "stoppedByInteractiveTool",
        partialToolResults: [{}, {}] as ToolCallInfo[],
        pendingToolCalls: [{}] as ToolCallInfo[],
      })
      expect(checkResult.passed).toBe(true)
    })
  })
})
