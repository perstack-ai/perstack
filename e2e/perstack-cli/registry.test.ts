/**
 * Registry E2E Tests
 *
 * Tests error handling for remote expert resolution:
 * - Nonexistent remote experts (e.g., @user/expert)
 * - Invalid expert key formats
 * - Failed delegation to nonexistent remote experts
 *
 * These tests verify graceful error handling without LLM API calls
 * (errors occur before LLM generation starts).
 *
 * TOML: e2e/experts/error-handling.toml
 */
import { describe, expect, it } from "vitest"
import { runCli } from "../lib/runner.js"

const CONFIG = "./e2e/experts/error-handling.toml"

describe.concurrent("Registry", () => {
  /** Verifies error message for nonexistent @user/expert format */
  it("should fail gracefully for nonexistent remote expert", async () => {
    const result = await runCli([
      "run",
      "--runtime",
      "local",
      "@nonexistent-user/nonexistent-expert",
      "test query",
    ])
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toMatch(/not found|does not exist|failed/i)
  })

  /** Verifies error for malformed expert key like @invalid */
  it("should fail gracefully for invalid expert key format", async () => {
    const result = await runCli(["run", "--runtime", "local", "@invalid", "test query"])
    expect(result.exitCode).toBe(1)
  })

  /** Verifies error when expert tries to delegate to nonexistent expert */
  it("should fail gracefully when delegating to nonexistent remote expert", async () => {
    const result = await runCli([
      "run",
      "--runtime",
      "local",
      "--config",
      CONFIG,
      "e2e-invalid-delegate",
      "test",
    ])
    expect(result.exitCode).not.toBe(0)
  })
})
