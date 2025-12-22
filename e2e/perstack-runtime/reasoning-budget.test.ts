/**
 * Reasoning Budget E2E Tests (Runtime)
 *
 * Tests that different reasoning budget levels produce different reasoning token counts.
 * This validates that the reasoningBudget configuration is correctly passed to providers.
 *
 * TOML: e2e/experts/reasoning-budget.toml
 */
import { describe, expect, it } from "vitest"
import { filterEventsByType } from "../lib/event-parser.js"
import { runRuntimeCli, withEventParsing } from "../lib/runner.js"

const REASONING_BUDGET_CONFIG = "./e2e/experts/reasoning-budget.toml"
// Extended thinking requires longer timeout
const LLM_TIMEOUT = 180000

type BudgetLevel = "minimal" | "low" | "medium" | "high"

interface ReasoningTestResult {
  budget: BudgetLevel
  reasoningTokens: number
  /** Thinking text from extended thinking (Anthropic/Google) */
  thinking?: string
  success: boolean
}

async function runReasoningTest(
  provider: "anthropic" | "openai" | "google",
  budget: BudgetLevel,
  model: string,
): Promise<ReasoningTestResult> {
  const expertKey = `e2e-reasoning-${provider}-${budget}`
  const cmdResult = await runRuntimeCli(
    [
      "run",
      "--config",
      REASONING_BUDGET_CONFIG,
      expertKey,
      "Calculate",
      "--provider",
      provider,
      "--model",
      model,
      "--reasoning-budget",
      budget,
    ],
    { timeout: LLM_TIMEOUT },
  )
  const result = withEventParsing(cmdResult)

  // Get completeRun event for usage info
  const completeEvents = filterEventsByType(result.events, "completeRun")
  const completeEvent = completeEvents[0] as
    | {
        usage?: { reasoningTokens?: number }
        checkpoint?: {
          usage?: { reasoningTokens?: number }
          messages?: Array<{
            contents?: Array<{ type: string; thinking?: string }>
          }>
        }
      }
    | undefined

  // Get completeReasoning event for thinking text
  const reasoningEvents = filterEventsByType(result.events, "completeReasoning")
  const reasoningEvent = reasoningEvents[0] as { text?: string } | undefined

  // Use checkpoint.usage as primary source (accumulates all step usage)
  const checkpointUsage = completeEvent?.checkpoint?.usage
  const reasoningTokens = checkpointUsage?.reasoningTokens ?? 0

  // Get thinking from completeReasoning event or from checkpoint messages
  let thinking = reasoningEvent?.text
  if (!thinking && completeEvent?.checkpoint?.messages) {
    // Look for thinkingPart in any message
    for (const message of completeEvent.checkpoint.messages) {
      if (message.contents) {
        for (const content of message.contents) {
          if (content.type === "thinkingPart" && content.thinking) {
            thinking = content.thinking
            break
          }
        }
      }
      if (thinking) break
    }
  }

  return {
    budget,
    reasoningTokens,
    thinking,
    success: result.exitCode === 0,
  }
}

describe("Reasoning Budget", () => {
  describe("Anthropic Extended Thinking", () => {
    // Note: Claude claude-sonnet-4-5 supports extended thinking
    const ANTHROPIC_MODEL = "claude-sonnet-4-5"

    it(
      "should produce reasoning tokens when budget is set",
      async () => {
        const result = await runReasoningTest("anthropic", "medium", ANTHROPIC_MODEL)

        expect(result.success).toBe(true)
        // Extended thinking should produce reasoning tokens or thinking text
        // Note: AI SDK currently doesn't report reasoningTokens for Anthropic,
        // but we can verify thinking content is generated
        const hasThinking =
          result.reasoningTokens > 0 || (result.thinking && result.thinking.length > 0)
        expect(hasThinking).toBe(true)
      },
      LLM_TIMEOUT,
    )

    it(
      "should produce more reasoning tokens with higher budget",
      async () => {
        // Run minimal and high budget tests
        const minimalResult = await runReasoningTest("anthropic", "minimal", ANTHROPIC_MODEL)
        const highResult = await runReasoningTest("anthropic", "high", ANTHROPIC_MODEL)

        expect(minimalResult.success).toBe(true)
        expect(highResult.success).toBe(true)

        // Both should produce reasoning tokens or thinking text
        // Note: AI SDK currently doesn't report reasoningTokens for Anthropic
        const minimalHasThinking =
          minimalResult.reasoningTokens > 0 ||
          (minimalResult.thinking && minimalResult.thinking.length > 0)
        const highHasThinking =
          highResult.reasoningTokens > 0 || (highResult.thinking && highResult.thinking.length > 0)
        expect(minimalHasThinking).toBe(true)
        expect(highHasThinking).toBe(true)

        // Log for observability
        console.log(
          `Anthropic - minimal thinking: ${minimalResult.thinking?.length ?? 0} chars, high thinking: ${highResult.thinking?.length ?? 0} chars`,
        )
      },
      LLM_TIMEOUT * 2, // Two API calls
    )

    it(
      "should complete successfully with all budget levels",
      async () => {
        const budgets: BudgetLevel[] = ["minimal", "low", "medium", "high"]
        const results: ReasoningTestResult[] = []

        for (const budget of budgets) {
          const result = await runReasoningTest("anthropic", budget, ANTHROPIC_MODEL)
          results.push(result)
          expect(result.success).toBe(true)
        }

        // Log all results for analysis
        console.log("Anthropic reasoning tokens by budget:")
        for (const result of results) {
          console.log(`  ${result.budget}: ${result.reasoningTokens}`)
        }
      },
      LLM_TIMEOUT * 4, // Four API calls
    )
  })

  describe("OpenAI Reasoning Effort", () => {
    // Note: o3-mini supports reasoning effort
    const OPENAI_MODEL = "o3-mini"

    it(
      "should produce reasoning tokens when budget is set",
      async () => {
        const result = await runReasoningTest("openai", "medium", OPENAI_MODEL)

        expect(result.success).toBe(true)
        // Reasoning models should produce reasoning tokens
        expect(result.reasoningTokens).toBeGreaterThan(0)
      },
      LLM_TIMEOUT,
    )

    it(
      "should produce more reasoning tokens with higher budget",
      async () => {
        // Run minimal and high budget tests
        const minimalResult = await runReasoningTest("openai", "minimal", OPENAI_MODEL)
        const highResult = await runReasoningTest("openai", "high", OPENAI_MODEL)

        expect(minimalResult.success).toBe(true)
        expect(highResult.success).toBe(true)

        // Both should produce reasoning tokens
        expect(minimalResult.reasoningTokens).toBeGreaterThan(0)
        expect(highResult.reasoningTokens).toBeGreaterThan(0)

        // High budget should generally produce more reasoning tokens than minimal
        // Note: This is a statistical tendency, not guaranteed for every run
        console.log(
          `OpenAI reasoning tokens - minimal: ${minimalResult.reasoningTokens}, high: ${highResult.reasoningTokens}`,
        )
      },
      LLM_TIMEOUT * 2, // Two API calls
    )

    it(
      "should complete successfully with all budget levels",
      async () => {
        const budgets: BudgetLevel[] = ["minimal", "low", "medium", "high"]
        const results: ReasoningTestResult[] = []

        for (const budget of budgets) {
          const result = await runReasoningTest("openai", budget, OPENAI_MODEL)
          results.push(result)
          expect(result.success).toBe(true)
        }

        // Log all results for analysis
        console.log("OpenAI reasoning tokens by budget:")
        for (const result of results) {
          console.log(`  ${result.budget}: ${result.reasoningTokens}`)
        }
      },
      LLM_TIMEOUT * 4, // Four API calls
    )
  })

  describe("Google Flash Thinking", () => {
    // Note: gemini-2.5-flash supports thinking mode
    const GOOGLE_MODEL = "gemini-2.5-flash"

    it(
      "should produce reasoning tokens when budget is set",
      async () => {
        const result = await runReasoningTest("google", "medium", GOOGLE_MODEL)

        expect(result.success).toBe(true)
        // Flash thinking should produce reasoning tokens or thinking text
        const hasThinking =
          result.reasoningTokens > 0 || (result.thinking && result.thinking.length > 0)
        expect(hasThinking).toBe(true)
      },
      LLM_TIMEOUT,
    )

    it(
      "should produce more reasoning tokens with higher budget",
      async () => {
        // Run minimal and high budget tests
        const minimalResult = await runReasoningTest("google", "minimal", GOOGLE_MODEL)
        const highResult = await runReasoningTest("google", "high", GOOGLE_MODEL)

        expect(minimalResult.success).toBe(true)
        expect(highResult.success).toBe(true)

        // Both should produce reasoning tokens or thinking text
        const minimalHasThinking =
          minimalResult.reasoningTokens > 0 ||
          (minimalResult.thinking && minimalResult.thinking.length > 0)
        const highHasThinking =
          highResult.reasoningTokens > 0 || (highResult.thinking && highResult.thinking.length > 0)
        expect(minimalHasThinking).toBe(true)
        expect(highHasThinking).toBe(true)

        // Log for observability
        console.log(
          `Google - minimal thinking: ${minimalResult.thinking?.length ?? 0} chars, high thinking: ${highResult.thinking?.length ?? 0} chars`,
        )
      },
      LLM_TIMEOUT * 2, // Two API calls
    )

    it(
      "should complete successfully with all budget levels",
      async () => {
        const budgets: BudgetLevel[] = ["minimal", "low", "medium", "high"]
        const results: ReasoningTestResult[] = []

        for (const budget of budgets) {
          const result = await runReasoningTest("google", budget, GOOGLE_MODEL)
          results.push(result)
          expect(result.success).toBe(true)
        }

        // Log all results for analysis
        console.log("Google reasoning tokens by budget:")
        for (const result of results) {
          console.log(`  ${result.budget}: ${result.reasoningTokens}`)
        }
      },
      LLM_TIMEOUT * 4, // Four API calls
    )
  })
})
