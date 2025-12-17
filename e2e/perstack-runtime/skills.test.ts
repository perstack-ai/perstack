import { describe, expect, it } from "vitest"
import { assertEventSequenceContains } from "../lib/assertions.js"
import { filterEventsByType } from "../lib/event-parser.js"
import { runRuntimeCli, withEventParsing } from "../lib/runner.js"

const SKILLS_CONFIG = "./e2e/experts/skills.toml"
// LLM API calls require extended timeout
const LLM_TIMEOUT = 180000

describe.concurrent("Skills", () => {
  it(
    "should only have access to picked tools",
    async () => {
      const cmdResult = await runRuntimeCli(
        [
          "run",
          "--config",
          SKILLS_CONFIG,
          "e2e-pick-tools",
          "Try to read file test.txt and report if you can",
        ],
        { timeout: LLM_TIMEOUT },
      )
      const result = withEventParsing(cmdResult)
      expect(result.exitCode).toBe(0)
      expect(assertEventSequenceContains(result.events, ["startRun", "completeRun"]).passed).toBe(
        true,
      )
      const callToolsEvents = filterEventsByType(result.events, "callTools")
      const hasReadTextFile = callToolsEvents.some((e) => {
        const calls = (e as { toolCalls?: { toolName: string }[] }).toolCalls ?? []
        return calls.some((c) => c.toolName === "readTextFile")
      })
      expect(hasReadTextFile).toBe(false)
    },
    LLM_TIMEOUT,
  )

  it(
    "should be able to use picked tools",
    async () => {
      const cmdResult = await runRuntimeCli(
        ["run", "--config", SKILLS_CONFIG, "e2e-pick-tools", "Think about something and complete"],
        { timeout: LLM_TIMEOUT },
      )
      const result = withEventParsing(cmdResult)
      expect(result.exitCode).toBe(0)
      const callToolsEvents = filterEventsByType(result.events, "callTools")
      const hasThink = callToolsEvents.some((e) => {
        const calls = (e as { toolCalls?: { toolName: string }[] }).toolCalls ?? []
        return calls.some((c) => c.toolName === "think")
      })
      const hasAttemptCompletion = callToolsEvents.some((e) => {
        const calls = (e as { toolCalls?: { toolName: string }[] }).toolCalls ?? []
        return calls.some((c) => c.toolName === "attemptCompletion")
      })
      expect(hasThink || hasAttemptCompletion).toBe(true)
    },
    LLM_TIMEOUT,
  )

  it(
    "should not have access to omitted tools",
    async () => {
      const cmdResult = await runRuntimeCli(
        ["run", "--config", SKILLS_CONFIG, "e2e-omit-tools", "Say hello"],
        { timeout: LLM_TIMEOUT },
      )
      const result = withEventParsing(cmdResult)
      expect(result.exitCode).toBe(0)
      const callToolsEvents = filterEventsByType(result.events, "callTools")
      const hasThink = callToolsEvents.some((e) => {
        const calls = (e as { toolCalls?: { toolName: string }[] }).toolCalls ?? []
        return calls.some((c) => c.toolName === "think")
      })
      expect(hasThink).toBe(false)
    },
    LLM_TIMEOUT,
  )

  it(
    "should have access to tools from multiple skills",
    async () => {
      const cmdResult = await runRuntimeCli(
        ["run", "--config", SKILLS_CONFIG, "e2e-multi-skill", "Think about AI and complete"],
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
})
