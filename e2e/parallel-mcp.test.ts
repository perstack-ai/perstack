import { beforeAll, describe, expect, it } from "vitest"
import { assertEventSequenceContains, assertToolCallCount } from "./lib/assertions.js"
import { filterEventsByType } from "./lib/event-parser.js"
import { type RunResult, runExpert } from "./lib/runner.js"

describe("Parallel MCP Tool Calls", () => {
  let result: RunResult

  beforeAll(async () => {
    result = await runExpert("e2e-parallel-mcp", "Test parallel MCP: search TypeScript and JavaScript", {
      configPath: "./e2e/experts/parallel-mcp.toml",
      timeout: 180000,
    })
  }, 200000)

  it("should execute multiple MCP tools in parallel", () => {
    expect(assertToolCallCount(result.events, "callTools", 2).passed).toBe(true)
    expect(
      assertEventSequenceContains(result.events, ["startRun", "callTools", "resolveToolResults"]).passed,
    ).toBe(true)
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
    expect(assertEventSequenceContains(result.events, ["completeRun"]).passed).toBe(true)
    expect(result.exitCode).toBe(0)
  })
})
