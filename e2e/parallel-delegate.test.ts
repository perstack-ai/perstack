import { beforeAll, describe, expect, it } from "vitest"
import { assertEventSequenceContains } from "./lib/assertions.js"
import { getEventSequence } from "./lib/event-parser.js"
import { type RunResult, runExpert } from "./lib/runner.js"

describe("Parallel Delegation", () => {
  let result: RunResult

  beforeAll(async () => {
    result = await runExpert(
      "e2e-parallel-delegate",
      "Test parallel delegation: call both math and text experts simultaneously",
      { configPath: "./e2e/experts/parallel-delegate.toml", timeout: 180000 },
    )
  }, 200000)

  it("should start run and call delegate", () => {
    expect(
      assertEventSequenceContains(result.events, ["startRun", "callDelegate", "stopRunByDelegate"])
        .passed,
    ).toBe(true)
  })

  it("should have two delegations in single stopRunByDelegate event", () => {
    const stopByDelegateEvent = result.events.find((e) => e.type === "stopRunByDelegate")
    expect(stopByDelegateEvent).toBeDefined()
    const checkpoint = (stopByDelegateEvent as { checkpoint?: { delegateTo?: unknown[] } })
      ?.checkpoint
    expect(checkpoint?.delegateTo?.length).toBe(2)
  })

  it("should complete all delegations", () => {
    const sequence = getEventSequence(result.events)
    expect(sequence.filter((e) => e === "completeRun").length).toBeGreaterThanOrEqual(2)
  })

  it("should resume and complete coordinator", () => {
    expect(
      assertEventSequenceContains(result.events, ["finishAllToolCalls", "completeRun"]).passed,
    ).toBe(true)
  })
})

describe("Parallel Delegation with Continue", () => {
  it("should continue after parallel delegation and complete with new query result", async () => {
    const initialResult = await runExpert(
      "e2e-parallel-delegate",
      "Test parallel delegation: call both math and text experts simultaneously",
      { configPath: "./e2e/experts/parallel-delegate.toml", timeout: 180000 },
    )
    expect(initialResult.jobId).not.toBeNull()
    const initialCompleteCount = getEventSequence(initialResult.events).filter(
      (e) => e === "completeRun",
    ).length
    expect(initialCompleteCount).toBeGreaterThanOrEqual(1)
    const continueResult = await runExpert(
      "e2e-parallel-delegate",
      "Now summarize the previous results in one sentence",
      {
        configPath: "./e2e/experts/parallel-delegate.toml",
        continueJobId: initialResult.jobId!,
        timeout: 180000,
      },
    )
    expect(
      assertEventSequenceContains(continueResult.events, ["startRun", "completeRun"]).passed,
    ).toBe(true)
    const continueCompleteEvents = continueResult.events.filter((e) => e.type === "completeRun")
    expect(continueCompleteEvents.length).toBeGreaterThanOrEqual(1)
    const lastCompleteEvent = continueCompleteEvents[continueCompleteEvents.length - 1]
    expect((lastCompleteEvent as { text?: string }).text).toBeDefined()
  }, 400000)
})
