import { describe, expect, it } from "vitest"
import { assertEventSequenceContains } from "./lib/assertions.js"
import { runCli, runExpert } from "./lib/runner.js"

describe("multi-runtime CLI", () => {
  describe("--runtime option parsing", () => {
    it("should accept perstack runtime flag", async () => {
      const result = await runCli(
        [
          "run",
          "--config",
          "./e2e/experts/special-tools.toml",
          "--runtime",
          "perstack",
          "e2e-special-tools",
          "Use attemptCompletion to say hello",
        ],
        { timeout: 120000 },
      )
      expect(result.exitCode).toBe(0)
    })

    it("should reject invalid runtime names", async () => {
      const result = await runCli([
        "run",
        "--config",
        "./e2e/experts/special-tools.toml",
        "--runtime",
        "invalid-runtime",
        "e2e-special-tools",
        "echo test",
      ])
      expect(result.exitCode).toBe(1)
    })
  })

  describe("runtime prerequisites", () => {
    it("should show helpful error or succeed for cursor", async () => {
      const result = await runCli(
        [
          "run",
          "--config",
          "./e2e/experts/special-tools.toml",
          "--runtime",
          "cursor",
          "e2e-special-tools",
          "echo test",
        ],
        { timeout: 120000 },
      )
      if (result.exitCode !== 0) {
        expect(result.stderr).toMatch(
          /not installed|prerequisites|not found|failed with exit code|timed out/i,
        )
      }
    })

    it("should show helpful error for claude-code when unavailable", async () => {
      const result = await runCli([
        "run",
        "--config",
        "./e2e/experts/special-tools.toml",
        "--runtime",
        "claude-code",
        "e2e-special-tools",
        "echo test",
      ])
      if (result.exitCode !== 0) {
        expect(result.stderr).toMatch(/not installed|prerequisites|not found/i)
      }
    })

    it("should show helpful error for gemini when unavailable", async () => {
      const result = await runCli([
        "run",
        "--config",
        "./e2e/experts/special-tools.toml",
        "--runtime",
        "gemini",
        "e2e-special-tools",
        "echo test",
      ])
      if (result.exitCode !== 0) {
        expect(result.stderr).toMatch(/not installed|prerequisites|API_KEY/i)
      }
    })
  })

  describe("continue with perstack runtime", () => {
    it("should continue job and receive new completeRun event", async () => {
      const initialResult = await runExpert("e2e-special-tools", "Use attemptCompletion to say hello", {
        configPath: "./e2e/experts/special-tools.toml",
        timeout: 120000,
      })
      expect(initialResult.jobId).not.toBeNull()
      expect(
        assertEventSequenceContains(initialResult.events, ["startRun", "completeRun"]).passed,
      ).toBe(true)
      const continueResult = await runExpert("e2e-special-tools", "Now say goodbye", {
        configPath: "./e2e/experts/special-tools.toml",
        continueJobId: initialResult.jobId!,
        timeout: 120000,
      })
      expect(
        assertEventSequenceContains(continueResult.events, ["startRun", "completeRun"]).passed,
      ).toBe(true)
      const completeEvents = continueResult.events.filter((e) => e.type === "completeRun")
      expect(completeEvents.length).toBeGreaterThanOrEqual(1)
      const lastComplete = completeEvents[completeEvents.length - 1] as { text?: string }
      expect(lastComplete.text).toBeDefined()
      expect(lastComplete.text?.length).toBeGreaterThan(0)
    }, 300000)
  })
})
