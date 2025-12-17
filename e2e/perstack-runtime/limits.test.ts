import { describe, expect, it } from "vitest"
import { assertEventSequenceContains } from "../lib/assertions.js"
import { runRuntimeCli, withEventParsing } from "../lib/runner.js"

describe("Execution Limits", () => {
  describe("Max steps limit", () => {
    it("should accept --max-steps option and complete within limit", async () => {
      const cmdResult = await runRuntimeCli(
        ["run", "--config", "./e2e/experts/global-runtime.toml", "--max-steps", "10", "e2e-global-runtime", "Say hello"],
        { timeout: 120000 },
      )
      const result = withEventParsing(cmdResult)
      expect(result.exitCode).toBe(0)
      expect(assertEventSequenceContains(result.events, ["startRun", "completeRun"]).passed).toBe(
        true,
      )
    }, 180000)
  })

  describe("Max retries limit", () => {
    it("should accept --max-retries option", async () => {
      const cmdResult = await runRuntimeCli(
        ["run", "--config", "./e2e/experts/global-runtime.toml", "--max-retries", "3", "e2e-global-runtime", "Say hello"],
        { timeout: 120000 },
      )
      const result = withEventParsing(cmdResult)
      expect(result.exitCode).toBe(0)
    }, 180000)
  })
})
