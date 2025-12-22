/**
 * CLI Options E2E Tests (Runtime)
 *
 * Tests CLI option handling in perstack-runtime:
 * - --provider, --model
 * - --max-steps, --max-retries, --timeout
 * - --job-id, --run-id, --env-path, --verbose
 *
 * TOML: e2e/experts/global-runtime.toml
 */
import { describe, expect, it } from "vitest"
import { assertEventSequenceContains } from "../lib/assertions.js"
import { runRuntimeCli, withEventParsing } from "../lib/runner.js"

const GLOBAL_RUNTIME_CONFIG = "./e2e/experts/global-runtime.toml"
// LLM API calls require extended timeout
const LLM_TIMEOUT = 120000

describe.concurrent("CLI Options", () => {
  /** Verifies --provider option is accepted. */
  it(
    "should accept --provider option",
    async () => {
      const result = await runRuntimeCli(
        [
          "run",
          "--config",
          GLOBAL_RUNTIME_CONFIG,
          "--provider",
          "anthropic",
          "e2e-global-runtime",
          "Say hello",
        ],
        { timeout: LLM_TIMEOUT },
      )
      expect(result.exitCode).toBe(0)
    },
    LLM_TIMEOUT,
  )

  /** Verifies --model option is accepted. */
  it(
    "should accept --model option",
    async () => {
      const result = await runRuntimeCli(
        [
          "run",
          "--config",
          GLOBAL_RUNTIME_CONFIG,
          "--model",
          "claude-sonnet-4-5",
          "e2e-global-runtime",
          "Say hello",
        ],
        { timeout: LLM_TIMEOUT },
      )
      expect(result.exitCode).toBe(0)
    },
    LLM_TIMEOUT,
  )

  /** Verifies --max-steps option is accepted. */
  it(
    "should accept --max-steps option",
    async () => {
      const result = await runRuntimeCli(
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
      expect(result.exitCode).toBe(0)
    },
    LLM_TIMEOUT,
  )

  /** Verifies --max-retries option is accepted. */
  it(
    "should accept --max-retries option",
    async () => {
      const result = await runRuntimeCli(
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
      expect(result.exitCode).toBe(0)
    },
    LLM_TIMEOUT,
  )

  /** Verifies --timeout option is accepted. */
  it(
    "should accept --timeout option",
    async () => {
      const result = await runRuntimeCli(
        [
          "run",
          "--config",
          GLOBAL_RUNTIME_CONFIG,
          "--timeout",
          "120000",
          "e2e-global-runtime",
          "Say hello",
        ],
        { timeout: LLM_TIMEOUT },
      )
      expect(result.exitCode).toBe(0)
    },
    LLM_TIMEOUT,
  )

  /** Verifies --job-id option is accepted and reflected in events. */
  it(
    "should accept --job-id option",
    async () => {
      const cmdResult = await runRuntimeCli(
        [
          "run",
          "--config",
          GLOBAL_RUNTIME_CONFIG,
          "--job-id",
          "test-job-123",
          "e2e-global-runtime",
          "Say hello",
        ],
        { timeout: LLM_TIMEOUT },
      )
      const result = withEventParsing(cmdResult)
      expect(result.exitCode).toBe(0)
      const startEvent = result.events.find((e) => e.type === "startRun")
      expect(startEvent).toBeDefined()
    },
    LLM_TIMEOUT,
  )

  /** Verifies --run-id option is accepted. */
  it(
    "should accept --run-id option",
    async () => {
      const cmdResult = await runRuntimeCli(
        [
          "run",
          "--config",
          GLOBAL_RUNTIME_CONFIG,
          "--run-id",
          "test-run-456",
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

  /** Verifies --env-path option is accepted. */
  it(
    "should accept --env-path option",
    async () => {
      const cmdResult = await runRuntimeCli(
        [
          "run",
          "--config",
          GLOBAL_RUNTIME_CONFIG,
          "--env-path",
          ".env",
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

  /** Verifies --verbose option is accepted. */
  it(
    "should accept --verbose option",
    async () => {
      const result = await runRuntimeCli(
        ["run", "--config", GLOBAL_RUNTIME_CONFIG, "--verbose", "e2e-global-runtime", "Say hello"],
        { timeout: LLM_TIMEOUT },
      )
      expect(result.exitCode).toBe(0)
    },
    LLM_TIMEOUT,
  )
})
