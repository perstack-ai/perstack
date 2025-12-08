import { beforeAll, describe, expect, it } from "vitest"
import { assertEventSequenceContains } from "./lib/assertions.js"
import { getEventSequence } from "./lib/event-parser.js"
import { type RunResult, runExpert } from "./lib/runner.js"

describe("Delegate Chain", () => {
  let result: RunResult

  beforeAll(async () => {
    result = await runExpert(
      "e2e-delegate-chain",
      "Test delegate chain: process this request through multiple levels",
      { configPath: "./e2e/experts/delegate-chain.toml", timeout: 180000 },
    )
  }, 200000)

  it("should delegate through chain", () => {
    expect(
      assertEventSequenceContains(result.events, ["startRun", "callDelegate", "stopRunByDelegate"]).passed,
    ).toBe(true)
  })

  it("should have multiple delegation levels", () => {
    const sequence = getEventSequence(result.events)
    expect(sequence.filter((e) => e === "callDelegate").length).toBeGreaterThanOrEqual(2)
    expect(sequence.filter((e) => e === "stopRunByDelegate").length).toBeGreaterThanOrEqual(2)
  })

  it("should return through chain and complete", () => {
    const sequence = getEventSequence(result.events)
    expect(sequence.filter((e) => e === "completeRun").length).toBeGreaterThanOrEqual(3)
  })
})
