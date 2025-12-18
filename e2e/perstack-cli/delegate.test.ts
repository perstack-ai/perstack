import { describe, expect, it } from "vitest"
import { assertNoRetry } from "../lib/assertions.js"
import { runCli, withEventParsing } from "../lib/runner.js"

const CHAIN_CONFIG = "./e2e/experts/delegate-chain.toml"
// LLM API calls require extended timeout beyond the default 30s
const LLM_TIMEOUT = 180000

describe("Delegate to Expert", () => {
  /**
   * Test: Chain delegation through multiple expert levels
   *
   * Flow:
   * 1. Run e2e-delegate-chain with a test query
   * 2. Chain expert delegates to e2e-delegate-level1
   * 3. Level1 expert delegates to e2e-delegate-level2
   * 4. Level2 expert processes and returns result
   * 5. Results bubble up through the chain
   *
   * TOML (delegate-chain.toml):
   * - e2e-delegate-chain → delegates to e2e-delegate-level1
   * - e2e-delegate-level1 → delegates to e2e-delegate-level2
   * - e2e-delegate-level2 → processes and calls attemptCompletion
   *
   * Expected control flow (in order):
   * 1. startRun:chain → callDelegate:chain → stopRunByDelegate:chain
   * 2. startRun:level1 → callDelegate:level1 → stopRunByDelegate:level1
   * 3. startRun:level2 → completeRun:level2
   * 4. startRun:level1 (resume) → completeRun:level1
   * 5. startRun:chain (resume) → completeRun:chain
   */
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
    expect(assertNoRetry(result.events).passed).toBe(true)
    const events = result.events as { type: string; expertKey: string }[]
    const controlFlow = events
      .filter((e) =>
        ["startRun", "callDelegate", "stopRunByDelegate", "completeRun"].includes(e.type),
      )
      .map((e) => `${e.type}:${e.expertKey}`)
    expect(controlFlow).toEqual([
      "startRun:e2e-delegate-chain",
      "callDelegate:e2e-delegate-chain",
      "stopRunByDelegate:e2e-delegate-chain",
      "startRun:e2e-delegate-level1",
      "callDelegate:e2e-delegate-level1",
      "stopRunByDelegate:e2e-delegate-level1",
      "startRun:e2e-delegate-level2",
      "completeRun:e2e-delegate-level2",
      "startRun:e2e-delegate-level1",
      "completeRun:e2e-delegate-level1",
      "startRun:e2e-delegate-chain",
      "completeRun:e2e-delegate-chain",
    ])
  })
})
