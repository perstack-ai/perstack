/**
 * Error Handling E2E Tests (Runtime)
 *
 * Tests graceful error handling in perstack-runtime:
 * - Tool error recovery (file not found)
 * - Invalid MCP skill command
 * - Invalid provider name
 *
 * TOML: e2e/experts/error-handling.toml, e2e/experts/errors.toml
 */
import { describe, expect, it } from "vitest"
import { assertEventSequenceContains } from "../lib/assertions.js"
import { filterEventsByType } from "../lib/event-parser.js"
import { runRuntimeCli, withEventParsing } from "../lib/runner.js"

const ERROR_HANDLING_CONFIG = "./e2e/experts/error-handling.toml"
const ERRORS_CONFIG = "./e2e/experts/errors.toml"
const GLOBAL_RUNTIME_CONFIG = "./e2e/experts/global-runtime.toml"
// LLM API calls require extended timeout
const LLM_TIMEOUT = 180000

describe.concurrent("Error Handling", () => {
  /** Verifies expert can recover from tool errors and complete. */
  it(
    "should recover from file not found error and complete successfully",
    async () => {
      const cmdResult = await runRuntimeCli(
        [
          "run",
          "--config",
          ERROR_HANDLING_CONFIG,
          "e2e-tool-error-recovery",
          "Read the file at nonexistent_file_12345.txt and report what happened",
        ],
        { timeout: LLM_TIMEOUT },
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
    },
    LLM_TIMEOUT,
  )

  /** Verifies graceful failure for broken MCP skill. */
  it("should fail gracefully when MCP skill command is invalid", async () => {
    const result = await runRuntimeCli([
      "run",
      "--config",
      ERRORS_CONFIG,
      "e2e-mcp-error",
      "Say hello",
    ])
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toMatch(/failed|error|spawn|ENOENT/i)
  })

  /** Verifies rejection of invalid provider name. */
  it("should fail with invalid provider name", async () => {
    const result = await runRuntimeCli([
      "run",
      "--config",
      GLOBAL_RUNTIME_CONFIG,
      "--provider",
      "invalid-provider-xyz",
      "e2e-global-runtime",
      "Say hello",
    ])
    expect(result.exitCode).toBe(1)
  })
})
