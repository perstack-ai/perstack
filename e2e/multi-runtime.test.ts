import { describe, expect, it } from "vitest"
import { runCli } from "./lib/runner.js"

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

  describe("external runtime prerequisites", () => {
    it("should show helpful error for cursor when unavailable", async () => {
      const result = await runCli([
        "run",
        "--config",
        "./e2e/experts/special-tools.toml",
        "--runtime",
        "cursor",
        "e2e-special-tools",
        "echo test",
      ])
      if (result.exitCode !== 0) {
        expect(result.stderr).toMatch(/not installed|prerequisites|not found/i)
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
})
