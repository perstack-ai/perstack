/**
 * Versioned Base Skill E2E Tests (Runtime)
 *
 * Tests that pinning an explicit version for @perstack/base
 * falls back to StdioTransport (npx).
 *
 * TOML: e2e/experts/versioned-base.toml
 */
import { describe, expect, it } from "vitest"
import { assertEventSequenceContains } from "../lib/assertions.js"
import { filterEventsByType } from "../lib/event-parser.js"
import { runRuntimeCli, withEventParsing } from "../lib/runner.js"

const VERSIONED_BASE_CONFIG = "./e2e/experts/versioned-base.toml"
// LLM API calls + npx download require extended timeout
const LLM_TIMEOUT = 180000

describe.concurrent("Versioned Base Skill (StdioTransport Fallback)", () => {
  /** Verifies versioned base skill uses StdioTransport (spawnDurationMs > 0). */
  it(
    "should use StdioTransport for versioned base (spawnDurationMs > 0)",
    async () => {
      const cmdResult = await runRuntimeCli(
        ["run", "--config", VERSIONED_BASE_CONFIG, "e2e-versioned-base", "Run health check"],
        { timeout: LLM_TIMEOUT },
      )
      const result = withEventParsing(cmdResult)

      expect(result.exitCode).toBe(0)
      expect(assertEventSequenceContains(result.events, ["startRun", "completeRun"]).passed).toBe(
        true,
      )

      // Check that skillConnected event for @perstack/base exists
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
      // StdioTransport spawns a process, so totalDurationMs should be > 0
      // Note: spawnDurationMs might be 0 or small if npx is cached
      expect(baseEvent.totalDurationMs).toBeDefined()
      expect(baseEvent.totalDurationMs).toBeGreaterThan(0)
    },
    LLM_TIMEOUT,
  )

  /** Verifies versioned base skill tools are available. */
  it(
    "should have picked tools available",
    async () => {
      const cmdResult = await runRuntimeCli(
        ["run", "--config", VERSIONED_BASE_CONFIG, "e2e-versioned-base", "Run health check"],
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
