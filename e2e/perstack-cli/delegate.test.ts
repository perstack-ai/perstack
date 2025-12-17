import { describe, expect, it } from "vitest"
import { assertEventSequenceContains } from "../lib/assertions.js"
import { getEventSequence } from "../lib/event-parser.js"
import { runCli, withEventParsing } from "../lib/runner.js"

describe.concurrent("Delegate to Expert", () => {
  it("should chain through multiple experts and complete all runs", async () => {
    const cmdResult = await runCli(
      [
        "run",
        "--config",
        "./e2e/experts/delegate-chain.toml",
        "--runtime",
        "local",
        "e2e-delegate-chain",
        "Test delegate chain: process this request through multiple levels",
      ],
      { timeout: 180000 },
    )
    const result = withEventParsing(cmdResult)

    expect(
      assertEventSequenceContains(result.events, ["startRun", "callDelegate", "stopRunByDelegate"])
        .passed,
    ).toBe(true)

    const sequence = getEventSequence(result.events)
    expect(sequence.filter((e) => e === "callDelegate").length).toBeGreaterThanOrEqual(2)
    expect(sequence.filter((e) => e === "stopRunByDelegate").length).toBeGreaterThanOrEqual(2)
    expect(sequence.filter((e) => e === "completeRun").length).toBeGreaterThanOrEqual(3)
  }, 200000)

  it("should delegate to multiple experts in parallel and resume coordinator", async () => {
    const cmdResult = await runCli(
      [
        "run",
        "--config",
        "./e2e/experts/parallel-delegate.toml",
        "--runtime",
        "local",
        "e2e-parallel-delegate",
        "Test parallel delegation: call both math and text experts simultaneously",
      ],
      { timeout: 180000 },
    )
    const result = withEventParsing(cmdResult)

    const stopByDelegateEvent = result.events.find((e) => e.type === "stopRunByDelegate")
    expect(stopByDelegateEvent).toBeDefined()
    const checkpoint = (stopByDelegateEvent as { checkpoint?: { delegateTo?: unknown[] } })
      ?.checkpoint
    expect(checkpoint?.delegateTo?.length).toBe(2)

    const sequence = getEventSequence(result.events)
    expect(sequence.filter((e) => e === "completeRun").length).toBeGreaterThanOrEqual(2)

    expect(
      assertEventSequenceContains(result.events, ["finishAllToolCalls", "completeRun"]).passed,
    ).toBe(true)
  }, 200000)
})
