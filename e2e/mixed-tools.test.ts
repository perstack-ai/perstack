import { describe, expect, it, beforeAll } from "vitest"
import {
  assertCheckpointState,
  assertEventSequenceContains,
  assertPartialResultsContain,
  assertToolCallCount,
} from "./lib/assertions.js"
import type { RunResult } from "./lib/runner.js"
import { runExpert } from "./lib/runner.js"

const EXPERT_KEY = "e2e-mixed-tools"
const QUERY = "Test mixed tool calls: search, delegate, and ask user"

describe("Mixed Tool Calls (MCP + Delegate + Interactive)", () => {
  let result: RunResult

  beforeAll(async () => {
    result = await runExpert(EXPERT_KEY, QUERY, {
      configPath: "./e2e/experts/mixed-tools.toml",
      timeout: 180000,
    })
  }, 200000)

  it("should generate 3 tool calls in priority order", () => {
    const countResult = assertToolCallCount(result.events, "callTools", 3)
    expect(countResult.passed).toBe(true)
    const sequenceResult = assertEventSequenceContains(result.events, [
      "startRun",
      "callTools",
      "callDelegate",
      "stopRunByDelegate",
    ])
    expect(sequenceResult.passed).toBe(true)
  })

  it("should collect MCP result before delegate", () => {
    const stateResult = assertCheckpointState(result.events, "stopRunByDelegate", {
      status: "stoppedByDelegate",
      partialToolResults: [{}] as { id: string; skillName: string; toolName: string }[],
      pendingToolCalls: [{}] as { id: string; skillName: string; toolName: string }[],
    })
    expect(stateResult.passed).toBe(true)
    const partialResult = assertPartialResultsContain(result.events, "stopRunByDelegate", [
      "web_search_exa",
    ])
    expect(partialResult.passed).toBe(true)
  })

  it("should resume with delegate result and process interactive", () => {
    const sequenceResult = assertEventSequenceContains(result.events, [
      "stopRunByDelegate",
      "startRun",
      "completeRun",
      "startRun",
      "resumeToolCalls",
      "callInteractiveTool",
      "stopRunByInteractiveTool",
    ])
    expect(sequenceResult.passed).toBe(true)
  })

  it("should have all partial results after interactive stop", () => {
    const stateResult = assertCheckpointState(result.events, "stopRunByInteractiveTool", {
      status: "stoppedByInteractiveTool",
      partialToolResults: [{}, {}] as { id: string; skillName: string; toolName: string }[],
      pendingToolCalls: [],
    })
    expect(stateResult.passed).toBe(true)
  })
})

