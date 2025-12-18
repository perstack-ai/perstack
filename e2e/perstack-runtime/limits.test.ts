/**
 * Execution Limits E2E Tests (Runtime)
 *
 * Tests execution limit options in perstack-runtime:
 * - --max-steps: Maximum generation steps
 * - --max-retries: Maximum retry attempts
 *
 * TOML: e2e/experts/global-runtime.toml
 */
import { describe, expect, it } from "vitest"
import { assertEventSequenceContains } from "../lib/assertions.js"
import { runRuntimeCli, withEventParsing } from "../lib/runner.js"

const GLOBAL_RUNTIME_CONFIG = "./e2e/experts/global-runtime.toml"
// LLM API calls require extended timeout
const LLM_TIMEOUT = 120000

describe.concurrent("Execution Limits", () => {
  /** Verifies --max-steps option is accepted and run completes. */
  it(
    "should accept --max-steps option and complete within limit",
    async () => {
      const cmdResult = await runRuntimeCli(
        [
          "run",
          "--config",
          GLOBAL_RUNTIME_CONFIG,
          "--max-steps",
          "10",
          "e2e-global-runtime",
          "Say hello",
        ],
        { timeout: LLM_TIMEOUT },
      )
      const result = withEventParsing(cmdResult)
      expect(result.exitCode).toBe(0)
      expect(assertEventSequenceContains(result.events, ["startRun", "completeRun"]).passed).toBe(
        true,
      )
    },
    LLM_TIMEOUT,
  )

  /** Verifies --max-retries option is accepted. */
  it(
    "should accept --max-retries option",
    async () => {
      const cmdResult = await runRuntimeCli(
        [
          "run",
          "--config",
          GLOBAL_RUNTIME_CONFIG,
          "--max-retries",
          "3",
          "e2e-global-runtime",
          "Say hello",
        ],
        { timeout: LLM_TIMEOUT },
      )
      const result = withEventParsing(cmdResult)
      expect(result.exitCode).toBe(0)
    },
    LLM_TIMEOUT,
  )
})
