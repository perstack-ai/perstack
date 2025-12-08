import { describe, expect, it, beforeAll } from "vitest"
import { assertEventSequenceContains, assertToolCallCount } from "./lib/assertions.js"
import { filterEventsByType } from "./lib/event-parser.js"
import type { RunResult } from "./lib/runner.js"
import { runExpert } from "./lib/runner.js"

const EXPERT_KEY = "e2e-parallel-mcp"
const QUERY = "Test parallel MCP: search TypeScript and JavaScript"

describe("Parallel MCP Tool Calls", () => {
  let result: RunResult

  beforeAll(async () => {
    result = await runExpert(EXPERT_KEY, QUERY, {
      configPath: "./e2e/experts/parallel-mcp.toml",
      timeout: 180000,
    })
  }, 200000)

  it("should execute multiple MCP tools in parallel", () => {
    const countResult = assertToolCallCount(result.events, "callTools", 2)
    expect(countResult.passed).toBe(true)
    const sequenceResult = assertEventSequenceContains(result.events, [
      "startRun",
      "callTools",
      "resolveToolResults",
    ])
    expect(sequenceResult.passed).toBe(true)
  })

  it("should resolve all MCP results before next step", () => {
    const resolveEvents = filterEventsByType(result.events, "resolveToolResults")
    const hasMultipleResults = resolveEvents.some((e) => {
      const toolResults = (e as { toolResults?: unknown[] }).toolResults ?? []
      return toolResults.length >= 2
    })
    expect(hasMultipleResults).toBe(true)
  })

  it("should complete run successfully", () => {
    const sequenceResult = assertEventSequenceContains(result.events, ["completeRun"])
    expect(sequenceResult.passed).toBe(true)
    expect(result.exitCode).toBe(0)
  })
})

