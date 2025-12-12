import { beforeAll, describe, expect, it } from "vitest"
import { assertEventSequenceContains } from "../lib/assertions.js"
import { getEventSequence } from "../lib/event-parser.js"
import { type RunResult, runExpert } from "../lib/runner.js"

describe("Delegate to Expert", () => {
  describe("Chain delegation", () => {
    let result: RunResult

    beforeAll(async () => {
      result = await runExpert(
        "e2e-delegate-chain",
        "Test delegate chain: process this request through multiple levels",
        { configPath: "./e2e/experts/delegate-chain.toml", timeout: 180000 },
      )
    }, 200000)

    it("should delegate to another expert", () => {
      expect(
        assertEventSequenceContains(result.events, [
          "startRun",
          "callDelegate",
          "stopRunByDelegate",
        ]).passed,
      ).toBe(true)
    })

    it("should chain through multiple experts", () => {
      const sequence = getEventSequence(result.events)
      expect(sequence.filter((e) => e === "callDelegate").length).toBeGreaterThanOrEqual(2)
      expect(sequence.filter((e) => e === "stopRunByDelegate").length).toBeGreaterThanOrEqual(2)
    })

    it("should return through chain and complete all runs", () => {
      const sequence = getEventSequence(result.events)
      expect(sequence.filter((e) => e === "completeRun").length).toBeGreaterThanOrEqual(3)
    })
  })

  describe("Parallel delegation", () => {
    let result: RunResult

    beforeAll(async () => {
      result = await runExpert(
        "e2e-parallel-delegate",
        "Test parallel delegation: call both math and text experts simultaneously",
        { configPath: "./e2e/experts/parallel-delegate.toml", timeout: 180000 },
      )
    }, 200000)

    it("should delegate to multiple experts in parallel", () => {
      const stopByDelegateEvent = result.events.find((e) => e.type === "stopRunByDelegate")
      expect(stopByDelegateEvent).toBeDefined()
      const checkpoint = (stopByDelegateEvent as { checkpoint?: { delegateTo?: unknown[] } })
        ?.checkpoint
      expect(checkpoint?.delegateTo?.length).toBe(2)
    })

    it("should complete all parallel delegations", () => {
      const sequence = getEventSequence(result.events)
      expect(sequence.filter((e) => e === "completeRun").length).toBeGreaterThanOrEqual(2)
    })

    it("should resume coordinator after delegations complete", () => {
      expect(
        assertEventSequenceContains(result.events, ["finishAllToolCalls", "completeRun"]).passed,
      ).toBe(true)
    })
  })
})
