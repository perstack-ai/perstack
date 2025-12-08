import {
  type AssertionResult,
  assertEventSequenceContains,
} from "../lib/assertions.js"
import { getEventSequence } from "../lib/event-parser.js"
import { type RunResult, runExpert, type TestSuite } from "../lib/runner.js"

const EXPERT_KEY = "e2e-delegate-chain"
const QUERY = "Test delegate chain: process this request through multiple levels"

let cachedResult: RunResult | null = null

async function getRunResult(): Promise<RunResult> {
  if (!cachedResult) {
    cachedResult = await runExpert(EXPERT_KEY, QUERY, {
      configPath: "./e2e/experts/delegate-chain.toml",
    })
  }
  return cachedResult
}

export const delegateChainSuite: TestSuite = {
  name: "Delegate Chain",
  tests: [
    {
      name: "Should delegate through chain",
      run: async (): Promise<AssertionResult[]> => {
        const result = await getRunResult()
        return [
          assertEventSequenceContains(result.events, [
            "startRun",
            "callDelegate",
            "stopRunByDelegate",
          ]),
        ]
      },
    },
    {
      name: "Should have multiple delegation levels",
      run: async (): Promise<AssertionResult[]> => {
        const result = await getRunResult()
        const sequence = getEventSequence(result.events)
        const delegateCount = sequence.filter((e) => e === "callDelegate").length
        const stopCount = sequence.filter((e) => e === "stopRunByDelegate").length
        return [
          {
            passed: delegateCount >= 2,
            message:
              delegateCount >= 2
                ? `Delegate chain depth: ${delegateCount}`
                : `Expected at least 2 delegations, got ${delegateCount}`,
            details: delegateCount >= 2 ? undefined : { sequence },
          },
          {
            passed: stopCount >= 2,
            message:
              stopCount >= 2
                ? `Delegate stops: ${stopCount}`
                : `Expected at least 2 delegate stops, got ${stopCount}`,
          },
        ]
      },
    },
    {
      name: "Should return through chain and complete",
      run: async (): Promise<AssertionResult[]> => {
        const result = await getRunResult()
        const sequence = getEventSequence(result.events)
        const completeCount = sequence.filter((e) => e === "completeRun").length
        return [
          {
            passed: completeCount >= 3,
            message:
              completeCount >= 3
                ? `All levels completed: ${completeCount} completeRun events`
                : `Expected 3 completeRun events (one per level), got ${completeCount}`,
            details: completeCount >= 3 ? undefined : { sequence },
          },
        ]
      },
    },
  ],
}

export function resetDelegateChainCache(): void {
  cachedResult = null
}

