import { describe, expect, it } from "vitest"
import { assertEventSequenceContains } from "../lib/assertions.js"
import { filterEventsByType } from "../lib/event-parser.js"
import { runRuntimeCli, withEventParsing } from "../lib/runner.js"

describe("Skills", () => {
  describe("Pick tools", () => {
    it("should only have access to picked tools", async () => {
      const cmdResult = await runRuntimeCli(
        [
          "run",
          "--config",
          "./e2e/experts/skills.toml",
          "e2e-pick-tools",
          "Try to read file test.txt and report if you can",
        ],
        { timeout: 180000 },
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
    }, 200000)

    it("should be able to use picked tools", async () => {
      const cmdResult = await runRuntimeCli(
        [
          "run",
          "--config",
          "./e2e/experts/skills.toml",
          "e2e-pick-tools",
          "Think about something and complete",
        ],
        { timeout: 180000 },
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
    }, 200000)
  })

  describe("Omit tools", () => {
    it("should not have access to omitted tools", async () => {
      const cmdResult = await runRuntimeCli(
        ["run", "--config", "./e2e/experts/skills.toml", "e2e-omit-tools", "Say hello"],
        { timeout: 180000 },
      )
      const result = withEventParsing(cmdResult)
      expect(result.exitCode).toBe(0)
      const callToolsEvents = filterEventsByType(result.events, "callTools")
      const hasThink = callToolsEvents.some((e) => {
        const calls = (e as { toolCalls?: { toolName: string }[] }).toolCalls ?? []
        return calls.some((c) => c.toolName === "think")
      })
      expect(hasThink).toBe(false)
    }, 200000)
  })

  describe("Multiple skills", () => {
    it("should have access to tools from multiple skills", async () => {
      const cmdResult = await runRuntimeCli(
        [
          "run",
          "--config",
          "./e2e/experts/skills.toml",
          "e2e-multi-skill",
          "Think about AI and complete",
        ],
        { timeout: 180000 },
      )
      const result = withEventParsing(cmdResult)
      expect(result.exitCode).toBe(0)
      expect(assertEventSequenceContains(result.events, ["startRun", "completeRun"]).passed).toBe(
        true,
      )
    }, 200000)
  })
})
