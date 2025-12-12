import { describe, expect, it } from "vitest"
import { assertEventSequenceContains } from "../lib/assertions.js"
import { runExpertWithRuntimeCli } from "../lib/runner.js"

describe("Execution Limits", () => {
  describe("Max steps limit", () => {
    it("should accept --max-steps option and complete within limit", async () => {
      const result = await runExpertWithRuntimeCli("e2e-global-runtime", "Say hello", {
        configPath: "./e2e/experts/global-runtime.toml",
        timeout: 120000,
        extraArgs: ["--max-steps", "10"],
      })
      expect(result.exitCode).toBe(0)
      expect(assertEventSequenceContains(result.events, ["startRun", "completeRun"]).passed).toBe(
        true,
      )
    }, 180000)
  })

  describe("Max retries limit", () => {
    it("should accept --max-retries option", async () => {
      const result = await runExpertWithRuntimeCli("e2e-global-runtime", "Say hello", {
        configPath: "./e2e/experts/global-runtime.toml",
        timeout: 120000,
        extraArgs: ["--max-retries", "3"],
      })
      expect(result.exitCode).toBe(0)
    }, 180000)
  })
})
