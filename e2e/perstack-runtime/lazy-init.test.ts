/**
 * Lazy Init E2E Tests (Runtime)
 *
 * Tests skill initialization behavior based on lazyInit setting:
 * - lazyInit = false (default): All skills must be fully connected BEFORE startRun
 * - lazyInit = true: startRun can occur BEFORE skill is fully connected
 *
 * TOML: e2e/experts/lazy-init.toml
 */
import { describe, expect, it } from "vitest"
import { runRuntimeCli, withEventParsing } from "../lib/runner.js"

const LAZY_INIT_CONFIG = "./e2e/experts/lazy-init.toml"
// LLM API calls require extended timeout
const LLM_TIMEOUT = 180000

type SkillConnectedEvent = {
  type: "skillConnected"
  skillName: string
  timestamp: number
}

type StartRunEvent = {
  type: "startRun"
  timestamp: number
}

type AnyEvent = { type: string; timestamp?: number; skillName?: string }

function getSkillConnectedEvents(events: AnyEvent[]): SkillConnectedEvent[] {
  return events.filter((e) => e.type === "skillConnected") as SkillConnectedEvent[]
}

function getStartRunEvent(events: AnyEvent[]): StartRunEvent | undefined {
  return events.find((e) => e.type === "startRun") as StartRunEvent | undefined
}

describe.concurrent("Lazy Init", () => {
  /**
   * Tests all skills with lazyInit=false:
   * All MCP servers must be fully connected BEFORE startRun begins.
   */
  it(
    "all lazyInit=false: all skills should be connected before startRun",
    async () => {
      const cmdResult = await runRuntimeCli(
        ["run", "--config", LAZY_INIT_CONFIG, "e2e-lazy-init-all-false", "Complete the task"],
        { timeout: LLM_TIMEOUT },
      )
      const result = withEventParsing(cmdResult)
      expect(result.exitCode).toBe(0)

      const events = result.events as AnyEvent[]
      const skillConnectedEvents = getSkillConnectedEvents(events)
      const startRunEvent = getStartRunEvent(events)

      expect(startRunEvent).toBeDefined()

      // Find skill events
      const baseSkillEvent = skillConnectedEvents.find((e) => e.skillName === "@perstack/base")
      const attackerSkillEvent = skillConnectedEvents.find((e) => e.skillName === "attacker")

      expect(baseSkillEvent).toBeDefined()
      expect(attackerSkillEvent).toBeDefined()

      // Both skills (lazyInit=false) should be connected BEFORE startRun
      expect(baseSkillEvent!.timestamp).toBeLessThanOrEqual(startRunEvent!.timestamp)
      expect(attackerSkillEvent!.timestamp).toBeLessThanOrEqual(startRunEvent!.timestamp)

      // Run should complete successfully
      const completeRunEvent = events.find((e) => e.type === "completeRun")
      expect(completeRunEvent).toBeDefined()
    },
    LLM_TIMEOUT,
  )

  /**
   * Tests mixed lazyInit settings:
   * - @perstack/base is always lazyInit=false (enforced by runtime), so it blocks startRun
   * - attacker (@perstack/e2e-mcp-server) has lazyInit=true, runtime does NOT wait for it
   *
   * This verifies that:
   * 1. lazyInit=false skills are fully connected before startRun
   * 2. lazyInit=true skills do NOT block startRun (startRun occurs immediately after base connects)
   * 3. The run still completes successfully
   */
  it(
    "mixed: lazyInit=false blocks startRun, lazyInit=true does not block",
    async () => {
      const cmdResult = await runRuntimeCli(
        ["run", "--config", LAZY_INIT_CONFIG, "e2e-lazy-init-mixed", "Complete the task"],
        { timeout: LLM_TIMEOUT },
      )
      const result = withEventParsing(cmdResult)
      expect(result.exitCode).toBe(0)

      const events = result.events as AnyEvent[]
      const skillConnectedEvents = getSkillConnectedEvents(events)
      const startRunEvent = getStartRunEvent(events)

      expect(startRunEvent).toBeDefined()

      // Find skill events
      const baseSkillEvent = skillConnectedEvents.find((e) => e.skillName === "@perstack/base")
      const attackerSkillEvent = skillConnectedEvents.find((e) => e.skillName === "attacker")

      expect(baseSkillEvent).toBeDefined()
      expect(attackerSkillEvent).toBeDefined()

      // @perstack/base (lazyInit=false) should be connected BEFORE startRun
      expect(baseSkillEvent!.timestamp).toBeLessThanOrEqual(startRunEvent!.timestamp)

      // Verify that startRun happens immediately after base connects (not waiting for attacker)
      // The gap between base connected and startRun should be very small (< 10ms)
      const gapMs = startRunEvent!.timestamp - baseSkillEvent!.timestamp
      expect(gapMs).toBeLessThan(10)

      // Run should complete successfully
      const completeRunEvent = events.find((e) => e.type === "completeRun")
      expect(completeRunEvent).toBeDefined()
    },
    LLM_TIMEOUT,
  )
})
