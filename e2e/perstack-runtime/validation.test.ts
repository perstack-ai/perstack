/**
 * CLI Validation E2E Tests (Runtime)
 *
 * Tests CLI argument validation in perstack-runtime:
 * - --version, --help output
 * - Missing required arguments
 * - Nonexistent config files
 *
 * These tests do NOT invoke LLM APIs.
 */
import { describe, expect, it } from "vitest"
import { runRuntimeCli } from "../lib/runner.js"

describe.concurrent("CLI Validation", () => {
  // ─────────────────────────────────────────────────────────────────────────
  // Help and Version
  // ─────────────────────────────────────────────────────────────────────────

  /** Verifies --version outputs semver. */
  it("should show version", async () => {
    const result = await runRuntimeCli(["--version"])
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toMatch(/^\d+\.\d+\.\d+/)
  })

  /** Verifies --help outputs usage info. */
  it("should show help", async () => {
    const result = await runRuntimeCli(["--help"])
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain("perstack-runtime")
  })

  /** Verifies run --help shows expertKey and query. */
  it("should show run command help", async () => {
    const result = await runRuntimeCli(["run", "--help"])
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain("expertKey")
    expect(result.stdout).toContain("query")
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Missing Arguments
  // ─────────────────────────────────────────────────────────────────────────

  /** Verifies run requires expert and query. */
  it("should fail without arguments", async () => {
    const result = await runRuntimeCli(["run"])
    expect(result.exitCode).toBe(1)
  })

  /** Verifies run requires query after expert key. */
  it("should fail with only expert key", async () => {
    const result = await runRuntimeCli(["run", "expertOnly"])
    expect(result.exitCode).toBe(1)
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Nonexistent Resources
  // ─────────────────────────────────────────────────────────────────────────

  /** Verifies error for nonexistent expert. */
  it("should fail for nonexistent expert", async () => {
    const result = await runRuntimeCli(["run", "nonexistent-expert", "test query"])
    expect(result.exitCode).toBe(1)
  })

  /** Verifies error for nonexistent config file. */
  it("should fail with nonexistent config file", async () => {
    const result = await runRuntimeCli(["run", "expert", "query", "--config", "nonexistent.toml"])
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain("nonexistent.toml")
  })
})
