import { describe, expect, it } from "vitest"
import { assertEventSequenceContains } from "../lib/assertions.js"
import { getEventSequence } from "../lib/event-parser.js"
import { runCli, withEventParsing } from "../lib/runner.js"

const CHAIN_CONFIG = "./e2e/experts/delegate-chain.toml"
const PARALLEL_CONFIG = "./e2e/experts/parallel-delegate.toml"
// LLM API calls require extended timeout beyond the default 30s
const LLM_TIMEOUT = 180000

describe.concurrent("Delegate to Expert", () => {
  it("should chain through multiple experts and complete all runs", async () => {
    const cmdResult = await runCli(
      [
        "run",
        "--config",
        CHAIN_CONFIG,
        "--runtime",
        "local",
        "e2e-delegate-chain",
        "Test delegate chain: process this request through multiple levels",
      ],
      { timeout: LLM_TIMEOUT },
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
  })

  it("should delegate to multiple experts in parallel and resume coordinator", async () => {
    const cmdResult = await runCli(
      [
        "run",
        "--config",
        PARALLEL_CONFIG,
        "--runtime",
        "local",
        "e2e-parallel-delegate",
        "Test parallel delegation: call both math and text experts simultaneously",
      ],
      { timeout: LLM_TIMEOUT },
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
  })
})
