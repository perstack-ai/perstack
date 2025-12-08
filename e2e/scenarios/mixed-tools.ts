import {
  assertCheckpointState,
  assertEventSequenceContains,
  assertPartialResultsContain,
  assertToolCallCount,
  type AssertionResult,
} from "../lib/assertions.js"
import { runExpert, type TestSuite } from "../lib/runner.js"

const EXPERT_KEY = "e2e-mixed-tools"
const QUERY = "Test mixed tool calls: search, delegate, and ask user"

export const mixedToolsSuite: TestSuite = {
  name: "Mixed Tool Calls (MCP + Delegate + Interactive)",
  tests: [
    {
      name: "Should generate 3 tool calls in priority order",
      run: async (): Promise<AssertionResult[]> => {
        const result = await runExpert(EXPERT_KEY, QUERY, {
          configPath: "./e2e/experts/mixed-tools.toml",
        })
        return [
          assertToolCallCount(result.events, "callTools", 3),
          assertEventSequenceContains(result.events, [
            "startRun",
            "callTools",
            "callDelegate",
            "stopRunByDelegate",
          ]),
        ]
      },
    },
    {
      name: "Should collect MCP result before delegate",
      run: async (): Promise<AssertionResult[]> => {
        const result = await runExpert(EXPERT_KEY, QUERY, {
          configPath: "./e2e/experts/mixed-tools.toml",
        })
        return [
          assertCheckpointState(result.events, "stopRunByDelegate", {
            status: "stoppedByDelegate",
            partialToolResults: [{}] as { id: string; skillName: string; toolName: string }[],
            pendingToolCalls: [{}] as { id: string; skillName: string; toolName: string }[],
          }),
          assertPartialResultsContain(result.events, "stopRunByDelegate", ["web_search_exa"]),
        ]
      },
    },
    {
      name: "Should resume with delegate result and process interactive",
      run: async (): Promise<AssertionResult[]> => {
        const result = await runExpert(EXPERT_KEY, QUERY, {
          configPath: "./e2e/experts/mixed-tools.toml",
        })
        return [
          assertEventSequenceContains(result.events, [
            "stopRunByDelegate",
            "startRun",
            "completeRun",
            "startRun",
            "resumeToolCalls",
            "callInteractiveTool",
            "stopRunByInteractiveTool",
          ]),
        ]
      },
    },
    {
      name: "Should have all partial results after interactive stop",
      run: async (): Promise<AssertionResult[]> => {
        const result = await runExpert(EXPERT_KEY, QUERY, {
          configPath: "./e2e/experts/mixed-tools.toml",
        })
        return [
          assertCheckpointState(result.events, "stopRunByInteractiveTool", {
            status: "stoppedByInteractiveTool",
            partialToolResults: [{}, {}] as { id: string; skillName: string; toolName: string }[],
            pendingToolCalls: [],
          }),
        ]
      },
    },
  ],
}

export async function runMixedToolsTests(): Promise<void> {
  const { runTestSuite } = await import("../lib/runner.js")
  await runTestSuite(mixedToolsSuite)
}

