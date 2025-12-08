import {
  type AssertionResult,
  assertEventSequenceContains,
  assertToolCallCount,
} from "../lib/assertions.js"
import { filterEventsByType } from "../lib/event-parser.js"
import { type RunResult, runExpert, type TestSuite } from "../lib/runner.js"

const EXPERT_KEY = "e2e-parallel-mcp"
const QUERY = "Test parallel MCP: search TypeScript and JavaScript"

let cachedResult: RunResult | null = null

async function getRunResult(): Promise<RunResult> {
  if (!cachedResult) {
    cachedResult = await runExpert(EXPERT_KEY, QUERY, {
      configPath: "./e2e/experts/parallel-mcp.toml",
    })
  }
  return cachedResult
}

export const parallelMcpSuite: TestSuite = {
  name: "Parallel MCP Tool Calls",
  tests: [
    {
      name: "Should execute multiple MCP tools in parallel",
      run: async (): Promise<AssertionResult[]> => {
        const result = await getRunResult()
        return [
          assertToolCallCount(result.events, "callTools", 2),
          assertEventSequenceContains(result.events, [
            "startRun",
            "callTools",
            "resolveToolResults",
          ]),
        ]
      },
    },
    {
      name: "Should resolve all MCP results before next step",
      run: async (): Promise<AssertionResult[]> => {
        const result = await getRunResult()
        const resolveEvents = filterEventsByType(result.events, "resolveToolResults")
        const hasMultipleResults = resolveEvents.some((e) => {
          const toolResults = (e as { toolResults?: unknown[] }).toolResults ?? []
          return toolResults.length >= 2
        })
        return [
          {
            passed: hasMultipleResults,
            message: hasMultipleResults
              ? "Multiple MCP results resolved together"
              : "MCP results not resolved together",
            details: hasMultipleResults
              ? undefined
              : { resolveEventCount: resolveEvents.length },
          },
        ]
      },
    },
    {
      name: "Should complete run successfully",
      run: async (): Promise<AssertionResult[]> => {
        const result = await getRunResult()
        return [
          assertEventSequenceContains(result.events, ["completeRun"]),
          {
            passed: result.exitCode === 0,
            message:
              result.exitCode === 0
                ? "Run completed with exit code 0"
                : `Run failed with exit code ${result.exitCode}`,
          },
        ]
      },
    },
  ],
}

export function resetParallelMcpCache(): void {
  cachedResult = null
}

