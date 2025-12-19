/**
 * LLM Providers E2E Tests
 *
 * Tests that verify Perstack works correctly with multiple LLM providers:
 * - OpenAI (GPT models)
 * - Anthropic (Claude models)
 * - Google (Gemini models)
 *
 * Tests are skipped gracefully when the corresponding API key is not available.
 *
 * TOML: e2e/experts/providers.toml
 */
import { describe, expect, it } from "vitest"
import { assertEventSequenceContains } from "../lib/assertions.js"
import { hasAnthropicKey, hasGoogleKey, hasOpenAIKey } from "../lib/prerequisites.js"
import { runRuntimeCli, withEventParsing } from "../lib/runner.js"

const CONFIG = "./e2e/experts/providers.toml"
const LLM_TIMEOUT = 120000

const providers = [
  { provider: "openai", model: "gpt-4.1", hasKey: hasOpenAIKey },
  { provider: "anthropic", model: "claude-haiku-4-5", hasKey: hasAnthropicKey },
  { provider: "google", model: "gemini-2.5-flash", hasKey: hasGoogleKey },
]

describe.concurrent("LLM Providers", () => {
  it.each(providers)(
    "should complete with $provider provider",
    async ({ provider, model, hasKey }) => {
      if (!hasKey()) {
        console.log(`Skipping ${provider} test: API key not available`)
        return
      }
      const cmdResult = await runRuntimeCli(
        ["run", "--config", CONFIG, "e2e-providers", "Say hello"],
        { timeout: LLM_TIMEOUT, provider, model },
      )
      const result = withEventParsing(cmdResult)
      expect(result.exitCode).toBe(0)
      expect(assertEventSequenceContains(result.events, ["startRun", "completeRun"]).passed).toBe(
        true,
      )
      const completeEvent = result.events.find((e) => e.type === "completeRun")
      expect(completeEvent).toBeDefined()
      expect((completeEvent as { text?: string }).text?.length).toBeGreaterThan(0)
    },
    LLM_TIMEOUT,
  )
})
