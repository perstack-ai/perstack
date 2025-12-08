import { beforeAll, describe, expect, it } from "vitest"
import { assertEventSequenceContains, assertToolCallCount } from "./lib/assertions.js"
import { filterEventsByType } from "./lib/event-parser.js"
import { type RunResult, runExpert } from "./lib/runner.js"

describe("Special Tools Parallel Execution", () => {
  let result: RunResult

  beforeAll(async () => {
    result = await runExpert(
      "e2e-special-tools",
      "Test special tools: think about TypeScript benefits and search for it",
      {
        configPath: "./e2e/experts/special-tools.toml",
        timeout: 180000,
      },
    )
  }, 200000)

  it("should execute think and MCP tools in parallel", () => {
    expect(assertToolCallCount(result.events, "callTools", 2).passed).toBe(true)
    expect(
      assertEventSequenceContains(result.events, ["startRun", "callTools", "resolveToolResults"])
        .passed,
    ).toBe(true)
  })

  it("should resolve both think and MCP results together", () => {
    const resolveEvents = filterEventsByType(result.events, "resolveToolResults")
    const hasMultipleResults = resolveEvents.some((e) => {
      const toolResults = (e as { toolResults?: { toolName: string }[] }).toolResults ?? []
      return toolResults.length >= 2
    })
    expect(hasMultipleResults).toBe(true)
  })

  it("should include think tool in resolved results", () => {
    const resolveEvents = filterEventsByType(result.events, "resolveToolResults")
    const hasThinkResult = resolveEvents.some((e) => {
      const toolResults = (e as { toolResults?: { toolName: string }[] }).toolResults ?? []
      return toolResults.some((tr) => tr.toolName === "think")
    })
    expect(hasThinkResult).toBe(true)
  })

  it("should complete run successfully", () => {
    expect(assertEventSequenceContains(result.events, ["completeRun"]).passed).toBe(true)
    expect(result.exitCode).toBe(0)
  })
})
