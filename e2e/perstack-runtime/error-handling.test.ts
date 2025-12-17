import { describe, expect, it } from "vitest"
import { assertEventSequenceContains } from "../lib/assertions.js"
import { filterEventsByType } from "../lib/event-parser.js"
import { runRuntimeCli, withEventParsing } from "../lib/runner.js"

describe("Error Handling", () => {
  describe("Recover from tool error", () => {
    it("should recover from file not found error and complete successfully", async () => {
      const cmdResult = await runRuntimeCli(
        ["run", "--config", "./e2e/experts/error-handling.toml", "e2e-tool-error-recovery", "Read the file at nonexistent_file_12345.txt and report what happened"],
        { timeout: 180000 },
      )
      const result = withEventParsing(cmdResult)
      expect(result.exitCode).toBe(0)
      expect(
        assertEventSequenceContains(result.events, ["startRun", "callTools", "resolveToolResults"])
          .passed,
      ).toBe(true)
      const resolveEvents = filterEventsByType(result.events, "resolveToolResults")
      const hasFileNotFoundError = resolveEvents.some((e) => {
        const toolResults = (e as { toolResults?: { result?: { text?: string }[] }[] }).toolResults
        return toolResults?.some((tr) => tr.result?.some((r) => r.text?.includes("does not exist")))
      })
      expect(hasFileNotFoundError).toBe(true)
      expect(assertEventSequenceContains(result.events, ["completeRun"]).passed).toBe(true)
    }, 200000)
  })

  describe("MCP connection error", () => {
    it("should fail gracefully when MCP skill command is invalid", async () => {
      const result = await runRuntimeCli([
        "run",
        "--config",
        "./e2e/experts/errors.toml",
        "e2e-mcp-error",
        "Say hello",
      ])
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toMatch(/failed|error|spawn|ENOENT/i)
    }, 60000)
  })

  describe("Invalid provider", () => {
    it("should fail with invalid provider name", async () => {
      const result = await runRuntimeCli([
        "run",
        "--config",
        "./e2e/experts/global-runtime.toml",
        "--provider",
        "invalid-provider-xyz",
        "e2e-global-runtime",
        "Say hello",
      ])
      expect(result.exitCode).toBe(1)
    }, 60000)
  })
})
