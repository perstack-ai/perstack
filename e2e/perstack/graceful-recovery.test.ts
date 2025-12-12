import { describe, expect, it } from "vitest"
import { assertEventSequenceContains } from "../lib/assertions.js"
import { filterEventsByType } from "../lib/event-parser.js"
import { runCli, runExpert } from "../lib/runner.js"

describe("Graceful Error Recovery", () => {
  describe("Tool Error Recovery", () => {
    it("should recover from file not found error and complete successfully", async () => {
      const result = await runExpert(
        "e2e-tool-error-recovery",
        "Read the file at nonexistent_file_12345.txt and report what happened",
        {
          configPath: "./e2e/experts/error-handling.toml",
          timeout: 180000,
        },
      )
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

  describe("Invalid Configuration", () => {
    it("should fail with clear message for nonexistent delegate", async () => {
      const result = await runCli(
        ["run", "--config", "./e2e/experts/error-handling.toml", "e2e-invalid-delegate", "test"],
        { timeout: 60000 },
      )
      expect(result.exitCode).not.toBe(0)
      expect(result.stderr).toMatch(/not found|nonexistent/i)
    }, 120000)
  })
})
