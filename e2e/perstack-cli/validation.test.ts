/**
 * CLI Validation E2E Tests
 *
 * Tests CLI argument validation and error handling:
 * - Missing required arguments
 * - Invalid runtime names
 * - Nonexistent config files
 * - Invalid option combinations (e.g., --resume-from without --continue-job)
 *
 * These tests do NOT invoke LLM APIs - they test CLI parsing and validation.
 */
import { describe, expect, it } from "vitest"
import { runCli } from "../lib/runner.js"

describe.concurrent("CLI Validation", () => {
  // ─────────────────────────────────────────────────────────────────────────
  // Missing Arguments
  // ─────────────────────────────────────────────────────────────────────────

  /** Verifies run command requires expert and query */
  it("should fail without arguments", async () => {
    const result = await runCli(["run", "--runtime", "local"])
    expect(result.exitCode).toBe(1)
  })

  /** Verifies run command requires query after expert key */
  it("should fail with only expert key", async () => {
    const result = await runCli(["run", "--runtime", "local", "expertOnly"])
    expect(result.exitCode).toBe(1)
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Nonexistent Resources
  // ─────────────────────────────────────────────────────────────────────────

  /** Verifies error for expert not found in config */
  it("should fail for nonexistent expert", async () => {
    const result = await runCli(["run", "--runtime", "local", "nonexistent-expert", "test query"])
    expect(result.exitCode).toBe(1)
  })

  /** Verifies error for nonexistent config file path */
  it("should fail with nonexistent config file", async () => {
    const result = await runCli([
      "run",
      "--runtime",
      "local",
      "--config",
      "nonexistent.toml",
      "expert",
      "query",
    ])
    expect(result.exitCode).toBe(1)
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Invalid Option Combinations
  // ─────────────────────────────────────────────────────────────────────────

  /** Verifies --resume-from requires --continue-job */
  it("should fail when --resume-from is used without --continue-job", async () => {
    const result = await runCli([
      "run",
      "--runtime",
      "local",
      "--resume-from",
      "checkpoint-123",
      "test-expert",
      "test query",
    ])
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain("--resume-from requires --continue-job")
  })

  /** Verifies invalid runtime names are rejected */
  it("should reject invalid runtime name", async () => {
    const result = await runCli([
      "run",
      "--runtime",
      "invalid-runtime",
      "test-expert",
      "test query",
    ])
    expect(result.exitCode).toBe(1)
  })
  // ─────────────────────────────────────────────────────────────────────────
  // Delegation Errors
  // ─────────────────────────────────────────────────────────────────────────

  /** Verifies clear error message when delegate expert doesn't exist */
  it("should fail with clear message for nonexistent delegate", async () => {
    const result = await runCli([
      "run",
      "--config",
      "./e2e/experts/error-handling.toml",
      "--runtime",
      "local",
      "e2e-invalid-delegate",
      "test",
    ])
    expect(result.exitCode).not.toBe(0)
    expect(result.stderr).toMatch(/not found|nonexistent/i)
  })
})
