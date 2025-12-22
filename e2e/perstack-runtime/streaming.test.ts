/**
 * Streaming Events E2E Tests (Runtime)
 *
 * Tests that streaming events are emitted in the correct sequence:
 * - startReasoning → streamReasoning... → completeReasoning
 * - startRunResult → streamRunResult... → completeRun
 *
 * TOML: e2e/experts/reasoning-budget.toml (reuses reasoning budget experts)
 */
import { describe, expect, it } from "vitest"
import type { ParsedEvent } from "../lib/event-parser.js"
import { runRuntimeCli, withEventParsing } from "../lib/runner.js"

const STREAMING_CONFIG = "./e2e/experts/reasoning-budget.toml"
// Streaming tests need enough time for LLM response
const LLM_TIMEOUT = 180000

const STREAMING_EVENTS = [
  "startReasoning",
  "streamReasoning",
  "completeReasoning",
  "startRunResult",
  "streamRunResult",
  "completeRun",
] as const

type StreamingEventType = (typeof STREAMING_EVENTS)[number]

function filterStreamingEvents(events: ParsedEvent[]): ParsedEvent[] {
  return events.filter((e) => STREAMING_EVENTS.includes(e.type as StreamingEventType))
}

describe("Streaming Events", () => {
  describe("Event Sequence with Reasoning", () => {
    const ANTHROPIC_MODEL = "claude-sonnet-4-5"

    it(
      "emits reasoning events in correct order (start → stream... → complete)",
      async () => {
        const cmdResult = await runRuntimeCli(
          [
            "run",
            "--config",
            STREAMING_CONFIG,
            "e2e-reasoning-anthropic-medium",
            "Calculate 2+2",
            "--provider",
            "anthropic",
            "--model",
            ANTHROPIC_MODEL,
            "--reasoning-budget",
            "medium",
          ],
          { timeout: LLM_TIMEOUT },
        )
        const result = withEventParsing(cmdResult)

        expect(result.exitCode).toBe(0)

        // Get all streaming-related events
        const streamingEvents = filterStreamingEvents(result.events)

        // Verify reasoning events exist and are in order
        const reasoningEvents = streamingEvents.filter((e) =>
          ["startReasoning", "streamReasoning", "completeReasoning"].includes(e.type),
        )

        // With reasoning budget enabled, we should have reasoning events
        expect(reasoningEvents.length).toBeGreaterThan(0)

        if (reasoningEvents.length > 0) {
          // First event should be startReasoning
          expect(reasoningEvents[0]?.type).toBe("startReasoning")

          // Last event should be completeReasoning
          expect(reasoningEvents[reasoningEvents.length - 1]?.type).toBe("completeReasoning")

          // All middle events should be streamReasoning
          const middleEvents = reasoningEvents.slice(1, -1)
          expect(middleEvents.every((e) => e.type === "streamReasoning")).toBe(true)
        }
      },
      LLM_TIMEOUT,
    )

    it(
      "emits result events in correct order (start → stream... → complete)",
      async () => {
        const cmdResult = await runRuntimeCli(
          [
            "run",
            "--config",
            STREAMING_CONFIG,
            "e2e-reasoning-anthropic-medium",
            "Say hello",
            "--provider",
            "anthropic",
            "--model",
            ANTHROPIC_MODEL,
            "--reasoning-budget",
            "minimal",
          ],
          { timeout: LLM_TIMEOUT },
        )
        const result = withEventParsing(cmdResult)

        expect(result.exitCode).toBe(0)

        // Get all streaming-related events
        const streamingEvents = filterStreamingEvents(result.events)

        // Verify result events exist and are in order
        const resultEvents = streamingEvents.filter((e) =>
          ["startRunResult", "streamRunResult", "completeRun"].includes(e.type),
        )

        // We should always have at least completeRun
        expect(resultEvents.length).toBeGreaterThan(0)

        // Last event should always be completeRun
        expect(resultEvents[resultEvents.length - 1]?.type).toBe("completeRun")

        // Check for result streaming events (only present if GeneratingRunResult was reached)
        const hasResultStreaming = resultEvents.some((e) => e.type === "startRunResult")

        if (hasResultStreaming) {
          // First result event should be startRunResult
          const startIdx = resultEvents.findIndex((e) => e.type === "startRunResult")
          expect(startIdx).toBe(0)

          // All events between startRunResult and completeRun should be streamRunResult
          const middleEvents = resultEvents.slice(1, -1)
          expect(middleEvents.every((e) => e.type === "streamRunResult")).toBe(true)
        }
      },
      LLM_TIMEOUT,
    )

    it(
      "reasoning phase completes before result phase",
      async () => {
        const cmdResult = await runRuntimeCli(
          [
            "run",
            "--config",
            STREAMING_CONFIG,
            "e2e-reasoning-anthropic-medium",
            "Calculate 5*5",
            "--provider",
            "anthropic",
            "--model",
            ANTHROPIC_MODEL,
            "--reasoning-budget",
            "low",
          ],
          { timeout: LLM_TIMEOUT },
        )
        const result = withEventParsing(cmdResult)

        expect(result.exitCode).toBe(0)

        const streamingEvents = filterStreamingEvents(result.events)

        // Find indices
        const completeReasoningIdx = streamingEvents.findIndex(
          (e) => e.type === "completeReasoning",
        )
        const startRunResultIdx = streamingEvents.findIndex((e) => e.type === "startRunResult")

        // If both phases exist, reasoning should complete before result starts
        if (completeReasoningIdx !== -1 && startRunResultIdx !== -1) {
          expect(completeReasoningIdx).toBeLessThan(startRunResultIdx)
        }
      },
      LLM_TIMEOUT,
    )
  })

  describe("Without Reasoning", () => {
    // Use a model/provider without reasoning or with reasoning disabled
    const ANTHROPIC_MODEL = "claude-sonnet-4-20250514"

    it(
      "skips reasoning events when budget is none",
      async () => {
        const cmdResult = await runRuntimeCli(
          [
            "run",
            "--config",
            STREAMING_CONFIG,
            "e2e-reasoning-anthropic-medium",
            "Hello",
            "--provider",
            "anthropic",
            "--model",
            ANTHROPIC_MODEL,
            "--reasoning-budget",
            "none",
          ],
          { timeout: LLM_TIMEOUT },
        )
        const result = withEventParsing(cmdResult)

        expect(result.exitCode).toBe(0)

        const streamingEvents = filterStreamingEvents(result.events)

        // Should NOT have reasoning events
        expect(streamingEvents.some((e) => e.type === "startReasoning")).toBe(false)
        expect(streamingEvents.some((e) => e.type === "streamReasoning")).toBe(false)

        // Should still have result events (but might not have them if direct text completion)
        // The completeRun should always exist
        expect(result.events.some((e) => e.type === "completeRun")).toBe(true)
      },
      LLM_TIMEOUT,
    )
  })

  describe("Streaming Delta Content", () => {
    const ANTHROPIC_MODEL = "claude-sonnet-4-5"

    it(
      "streamReasoning events contain non-empty deltas",
      async () => {
        const cmdResult = await runRuntimeCli(
          [
            "run",
            "--config",
            STREAMING_CONFIG,
            "e2e-reasoning-anthropic-medium",
            "Think about the number 42",
            "--provider",
            "anthropic",
            "--model",
            ANTHROPIC_MODEL,
            "--reasoning-budget",
            "medium",
          ],
          { timeout: LLM_TIMEOUT },
        )
        const result = withEventParsing(cmdResult)

        expect(result.exitCode).toBe(0)

        // Get streamReasoning events
        const streamReasoningEvents = result.events.filter((e) => e.type === "streamReasoning")

        if (streamReasoningEvents.length > 0) {
          // Each streamReasoning should have a delta
          for (const event of streamReasoningEvents) {
            const delta = (event as { delta?: string }).delta
            expect(typeof delta).toBe("string")
          }

          // At least some deltas should be non-empty
          const nonEmptyDeltas = streamReasoningEvents.filter(
            (e) => ((e as { delta?: string }).delta ?? "").length > 0,
          )
          expect(nonEmptyDeltas.length).toBeGreaterThan(0)
        }
      },
      LLM_TIMEOUT,
    )

    it(
      "streamRunResult events contain non-empty deltas",
      async () => {
        const cmdResult = await runRuntimeCli(
          [
            "run",
            "--config",
            STREAMING_CONFIG,
            "e2e-reasoning-anthropic-medium",
            "Write a short greeting",
            "--provider",
            "anthropic",
            "--model",
            ANTHROPIC_MODEL,
            "--reasoning-budget",
            "minimal",
          ],
          { timeout: LLM_TIMEOUT },
        )
        const result = withEventParsing(cmdResult)

        expect(result.exitCode).toBe(0)

        // Get streamRunResult events
        const streamResultEvents = result.events.filter((e) => e.type === "streamRunResult")

        if (streamResultEvents.length > 0) {
          // Each streamRunResult should have a delta
          for (const event of streamResultEvents) {
            const delta = (event as { delta?: string }).delta
            expect(typeof delta).toBe("string")
          }

          // At least some deltas should be non-empty
          const nonEmptyDeltas = streamResultEvents.filter(
            (e) => ((e as { delta?: string }).delta ?? "").length > 0,
          )
          expect(nonEmptyDeltas.length).toBeGreaterThan(0)
        }
      },
      LLM_TIMEOUT,
    )
  })
})
