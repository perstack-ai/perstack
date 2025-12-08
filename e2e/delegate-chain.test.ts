import { describe, expect, it, beforeAll } from "vitest"
import { assertEventSequenceContains } from "./lib/assertions.js"
import { getEventSequence } from "./lib/event-parser.js"
import type { RunResult } from "./lib/runner.js"
import { runExpert } from "./lib/runner.js"

const EXPERT_KEY = "e2e-delegate-chain"
const QUERY = "Test delegate chain: process this request through multiple levels"

describe("Delegate Chain", () => {
  let result: RunResult

  beforeAll(async () => {
    result = await runExpert(EXPERT_KEY, QUERY, {
      configPath: "./e2e/experts/delegate-chain.toml",
      timeout: 180000,
    })
  }, 200000)

  it("should delegate through chain", () => {
    const sequenceResult = assertEventSequenceContains(result.events, [
      "startRun",
      "callDelegate",
      "stopRunByDelegate",
    ])
    expect(sequenceResult.passed).toBe(true)
  })

  it("should have multiple delegation levels", () => {
    const sequence = getEventSequence(result.events)
    const delegateCount = sequence.filter((e) => e === "callDelegate").length
    const stopCount = sequence.filter((e) => e === "stopRunByDelegate").length
    expect(delegateCount).toBeGreaterThanOrEqual(2)
    expect(stopCount).toBeGreaterThanOrEqual(2)
  })

  it("should return through chain and complete", () => {
    const sequence = getEventSequence(result.events)
    const completeCount = sequence.filter((e) => e === "completeRun").length
    expect(completeCount).toBeGreaterThanOrEqual(3)
  })
})

