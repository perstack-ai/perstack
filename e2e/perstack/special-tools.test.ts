import { beforeAll, describe, expect, it } from "vitest"
import { assertEventSequenceContains, assertToolCallCount } from "../lib/assertions.js"
import { filterEventsByType } from "../lib/event-parser.js"
import { type RunResult, runExpert } from "../lib/runner.js"

describe("Special Tools Parallel Execution", () => {
  let result: RunResult

  beforeAll(async () => {
    result = await runExpert(
      "e2e-special-tools",
      "Test all special tools: think, read the PDF, read the GIF image, and search",
      {
        configPath: "./e2e/experts/special-tools.toml",
        timeout: 180000,
      },
    )
  }, 200000)

  it("should execute all 4 tools in parallel", () => {
    expect(assertToolCallCount(result.events, "callTools", 4).passed).toBe(true)
    expect(
      assertEventSequenceContains(result.events, ["startRun", "callTools", "resolveToolResults"])
        .passed,
    ).toBe(true)
  })

  it("should resolve all tool results together", () => {
    const resolveEvents = filterEventsByType(result.events, "resolveToolResults")
    const hasAllResults = resolveEvents.some((e) => {
      const toolResults = (e as { toolResults?: { toolName: string }[] }).toolResults ?? []
      return toolResults.length >= 4
    })
    expect(hasAllResults).toBe(true)
  })

  it("should include think tool in resolved results", () => {
    const resolveEvents = filterEventsByType(result.events, "resolveToolResults")
    const hasThinkResult = resolveEvents.some((e) => {
      const toolResults = (e as { toolResults?: { toolName: string }[] }).toolResults ?? []
      return toolResults.some((tr) => tr.toolName === "think")
    })
    expect(hasThinkResult).toBe(true)
  })

  it("should include readPdfFile in resolved results", () => {
    const resolveEvents = filterEventsByType(result.events, "resolveToolResults")
    const hasPdfResult = resolveEvents.some((e) => {
      const toolResults = (e as { toolResults?: { toolName: string }[] }).toolResults ?? []
      return toolResults.some((tr) => tr.toolName === "readPdfFile")
    })
    expect(hasPdfResult).toBe(true)
  })

  it("should include readImageFile in resolved results", () => {
    const resolveEvents = filterEventsByType(result.events, "resolveToolResults")
    const hasImageResult = resolveEvents.some((e) => {
      const toolResults = (e as { toolResults?: { toolName: string }[] }).toolResults ?? []
      return toolResults.some((tr) => tr.toolName === "readImageFile")
    })
    expect(hasImageResult).toBe(true)
  })

  it("should include web_search_exa in resolved results", () => {
    const resolveEvents = filterEventsByType(result.events, "resolveToolResults")
    const hasSearchResult = resolveEvents.some((e) => {
      const toolResults = (e as { toolResults?: { toolName: string }[] }).toolResults ?? []
      return toolResults.some((tr) => tr.toolName === "web_search_exa")
    })
    expect(hasSearchResult).toBe(true)
  })

  it("should complete run successfully", () => {
    expect(assertEventSequenceContains(result.events, ["completeRun"]).passed).toBe(true)
    expect(result.exitCode).toBe(0)
  })
})
