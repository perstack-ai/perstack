/**
 * Publish Expert E2E Tests
 *
 * Tests CLI commands related to expert publishing:
 * - publish: Publish expert to registry
 * - unpublish: Remove expert from registry
 * - tag: Add tags to expert version
 * - status: Change expert availability status
 *
 * Most tests use --dry-run to avoid actual registry changes.
 * These tests do NOT invoke LLM APIs.
 *
 * TOML: e2e/experts/cli-commands.toml
 */
import { describe, expect, it } from "vitest"
import { runCli } from "../lib/runner.js"

const CONFIG_PATH = "./e2e/experts/cli-commands.toml"

describe.concurrent("Publish Expert", () => {
  // ─────────────────────────────────────────────────────────────────────────
  // publish command tests
  // ─────────────────────────────────────────────────────────────────────────

  /** Verifies --dry-run outputs JSON payload without publishing */
  it("should output JSON payload for valid expert with --dry-run", async () => {
    const result = await runCli([
      "publish",
      "e2e-publish-test",
      "--dry-run",
      "--config",
      CONFIG_PATH,
    ])
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toBeTruthy()
  })

  /** Verifies error for nonexistent expert */
  it("should fail for nonexistent expert", async () => {
    const result = await runCli(["publish", "nonexistent", "--dry-run", "--config", CONFIG_PATH])
    expect(result.exitCode).toBe(1)
  })

  /** Verifies error for nonexistent config file */
  it("should fail with nonexistent config file", async () => {
    const result = await runCli([
      "publish",
      "e2e-publish-test",
      "--dry-run",
      "--config",
      "nonexistent.toml",
    ])
    expect(result.exitCode).toBe(1)
  })

  /** Verifies error when no config found in cwd */
  it("should fail when no config in directory", async () => {
    const result = await runCli(["publish", "e2e-publish-test", "--dry-run"], { cwd: "/tmp" })
    expect(result.exitCode).toBe(1)
  })

  // ─────────────────────────────────────────────────────────────────────────
  // unpublish command tests
  // ─────────────────────────────────────────────────────────────────────────

  /** Verifies unpublish requires version in expert key */
  it("should fail without version", async () => {
    const result = await runCli(["unpublish", "no-version", "--force"])
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain("version")
  })

  /** Verifies unpublish requires --force flag */
  it("should fail without --force when version provided", async () => {
    const result = await runCli(["unpublish", "expert@1.0.0"])
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain("--force")
  })

  // ─────────────────────────────────────────────────────────────────────────
  // tag command tests
  // ─────────────────────────────────────────────────────────────────────────

  /** Verifies tag requires version in expert key */
  it("should fail without version", async () => {
    const result = await runCli(["tag", "no-version", "tag1"])
    expect(result.exitCode).toBe(1)
  })

  /** Verifies tag requires at least one tag argument */
  it("should fail without tags", async () => {
    const result = await runCli(["tag", "expert@1.0.0"])
    expect(result.exitCode).toBe(1)
  })

  // ─────────────────────────────────────────────────────────────────────────
  // status command tests
  // ─────────────────────────────────────────────────────────────────────────

  /** Verifies status requires version in expert key */
  it("should fail without version", async () => {
    const result = await runCli(["status", "no-version", "available"])
    expect(result.exitCode).toBe(1)
  })

  /** Verifies status requires status value argument */
  it("should fail without status value", async () => {
    const result = await runCli(["status", "expert@1.0.0"])
    expect(result.exitCode).toBe(1)
  })

  /** Verifies status rejects invalid status values */
  it("should fail with invalid status value", async () => {
    const result = await runCli(["status", "expert@1.0.0", "invalid-status"])
    expect(result.exitCode).toBe(1)
  })
})
