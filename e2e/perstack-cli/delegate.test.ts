import { describe, expect, it } from "vitest"
import { assertNoRetry } from "../lib/assertions.js"
import { runCli, withEventParsing } from "../lib/runner.js"

const CHAIN_CONFIG = "./e2e/experts/delegate-chain.toml"
// LLM API calls require extended timeout beyond the default 30s
const LLM_TIMEOUT = 180000

describe("Delegate to Expert", () => {
  /**
   * Flow: e2e-delegate-chain → e2e-delegate-level1 → e2e-delegate-level2 → complete chain
   * TOML: delegate-chain.toml defines 3 experts forming a delegation chain
   * Expected:
   *   - Chain starts at root, delegates to level1, then level2
   *   - Each expert calls attemptCompletion with "OK"
   *   - Control flow: chain→level1→level2→(complete)→level1→(complete)→chain→(complete)
   *   - Total 3 completeRun events (one per expert)
   */
  it("should chain through multiple experts", async () => {
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
    expect(cmdResult.exitCode).toBe(0)

    const result = withEventParsing(cmdResult)
    expect(assertNoRetry(result.events).passed).toBe(true)

    // Verify delegation chain control flow
    const controlFlow = result.events
      .filter((e) => ["startRun", "callDelegate", "stopRunByDelegate", "completeRun"].includes(e.type))
      .map((e) => `${e.type}:${(e as { expertKey: string }).expertKey}`)

    expect(controlFlow).toEqual([
      "startRun:e2e-delegate-chain",
      "callDelegate:e2e-delegate-chain",
      "stopRunByDelegate:e2e-delegate-chain",
      "startRun:e2e-delegate-level1",
      "callDelegate:e2e-delegate-level1",
      "stopRunByDelegate:e2e-delegate-level1",
      "startRun:e2e-delegate-level2",
      "completeRun:e2e-delegate-level2",
      "startRun:e2e-delegate-level1", // Resume after level2 completes
      "completeRun:e2e-delegate-level1",
      "startRun:e2e-delegate-chain", // Resume after level1 completes
      "completeRun:e2e-delegate-chain",
    ])

    // Verify all 3 experts completed
    const completeEvents = result.events.filter((e) => e.type === "completeRun")
    expect(completeEvents.length).toBe(3)
  })
})
