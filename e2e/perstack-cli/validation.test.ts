import { describe, expect, it } from "vitest"
import { runCli } from "../lib/runner.js"

describe("CLI Validation", () => {
  describe("run command", () => {
    it("should fail without arguments", async () => {
      const result = await runCli(["run"])
      expect(result.exitCode).toBe(1)
    })

    it("should fail with only expert key", async () => {
      const result = await runCli(["run", "expertOnly"])
      expect(result.exitCode).toBe(1)
    })

    it("should fail for nonexistent expert", async () => {
      const result = await runCli(["run", "nonexistent-expert", "test query"])
      expect(result.exitCode).toBe(1)
    })

    it("should fail with nonexistent config file", async () => {
      const result = await runCli(["run", "expert", "query", "--config", "nonexistent.toml"])
      expect(result.exitCode).toBe(1)
    })

    it("should fail when --resume-from is used without --continue-job", async () => {
      const result = await runCli([
        "run",
        "test-expert",
        "test query",
        "--resume-from",
        "checkpoint-123",
      ])
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain("--resume-from requires --continue-job")
    })

    it("should reject invalid runtime name", async () => {
      const result = await runCli([
        "run",
        "test-expert",
        "test query",
        "--runtime",
        "invalid-runtime",
      ])
      expect(result.exitCode).toBe(1)
    })
  })

  describe("Invalid configuration", () => {
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
