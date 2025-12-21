/**
 * Bundled Base Skill E2E Tests (Runtime)
 *
 * Tests that the bundled @perstack/base skill uses InMemoryTransport
 * for near-zero initialization latency.
 *
 * TOML: e2e/experts/bundled-base.toml
 */
import { describe, expect, it } from "vitest"
import { assertEventSequenceContains } from "../lib/assertions.js"
import { filterEventsByType } from "../lib/event-parser.js"
import { runRuntimeCli, withEventParsing } from "../lib/runner.js"

const BUNDLED_BASE_CONFIG = "./e2e/experts/bundled-base.toml"
// LLM API calls require extended timeout
const LLM_TIMEOUT = 120000

describe.concurrent("Bundled Base Skill", () => {
  /** Verifies bundled base skill initializes with InMemoryTransport (spawnDurationMs = 0). */
  it(
    "should use InMemoryTransport for bundled base (spawnDurationMs = 0)",
    async () => {
      const cmdResult = await runRuntimeCli(
        ["run", "--config", BUNDLED_BASE_CONFIG, "e2e-bundled-base", "Run health check"],
        { timeout: LLM_TIMEOUT },
      )
      const result = withEventParsing(cmdResult)

      expect(result.exitCode).toBe(0)
      expect(assertEventSequenceContains(result.events, ["startRun", "completeRun"]).passed).toBe(
        true,
      )

      // Check that skillConnected event for @perstack/base has spawnDurationMs = 0
      const skillConnectedEvents = filterEventsByType(result.events, "skillConnected")
      const baseSkillEvent = skillConnectedEvents.find((e) => {
        const event = e as { skillName?: string }
        return event.skillName === "@perstack/base"
      })

      expect(baseSkillEvent).toBeDefined()
      const baseEvent = baseSkillEvent as {
        skillName: string
        spawnDurationMs?: number
        totalDurationMs?: number
      }
      expect(baseEvent.spawnDurationMs).toBe(0) // InMemoryTransport has no spawn
      expect(baseEvent.totalDurationMs).toBeDefined()
      // InMemoryTransport should be significantly faster than ~500ms for npx
      expect(baseEvent.totalDurationMs).toBeLessThan(100)
    },
    LLM_TIMEOUT,
  )

  /** Verifies bundled base skill tools are available. */
  it(
    "should have all base skill tools available",
    async () => {
      const cmdResult = await runRuntimeCli(
        ["run", "--config", BUNDLED_BASE_CONFIG, "e2e-bundled-base", "Run health check"],
        { timeout: LLM_TIMEOUT },
      )
      const result = withEventParsing(cmdResult)

      expect(result.exitCode).toBe(0)

      // Check that healthCheck was called (from pick list)
      const callToolsEvents = filterEventsByType(result.events, "callTools")
      const hasHealthCheck = callToolsEvents.some((e) => {
        const event = e as { toolCalls?: Array<{ toolName: string }> }
        return event.toolCalls?.some((tc) => tc.toolName === "healthCheck")
      })
      expect(hasHealthCheck).toBe(true)
    },
    LLM_TIMEOUT,
  )
})
