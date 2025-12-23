/**
 * Log Command E2E Tests
 *
 * Tests the perstack log command functionality:
 * - Shows help text
 * - Handles missing job gracefully
 *
 * These tests do NOT invoke LLM APIs - they test CLI parsing and basic behavior.
 */
import { describe, expect, it } from "vitest"
import { runCli } from "../lib/runner.js"

describe("Log Command", () => {
  it("should show help text", async () => {
    const result = await runCli(["log", "--help"])
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain("View execution history")
    expect(result.stdout).toContain("--job")
    expect(result.stdout).toContain("--run")
    expect(result.stdout).toContain("--checkpoint")
    expect(result.stdout).toContain("--errors")
    expect(result.stdout).toContain("--tools")
    expect(result.stdout).toContain("--json")
  })

  it("should handle nonexistent job gracefully", async () => {
    const result = await runCli(["log", "--job", "nonexistent-job-id"])
    expect(result.stdout).toContain("No data found")
  })

  it("should accept valid options", async () => {
    const result = await runCli(["log", "--job", "test-job", "--json"])
    expect(result.stdout).toContain("No data found")
  })

  it("should accept step filter", async () => {
    const result = await runCli(["log", "--job", "test-job", "--step", "5"])
    expect(result.stdout).toContain("No data found")
  })

  it("should accept type filter", async () => {
    const result = await runCli(["log", "--job", "test-job", "--type", "callTools"])
    expect(result.stdout).toContain("No data found")
  })

  it("should accept errors preset", async () => {
    const result = await runCli(["log", "--errors"])
    expect(result.stdout).toContain("No data found")
  })

  it("should accept tools preset", async () => {
    const result = await runCli(["log", "--tools"])
    expect(result.stdout).toContain("No data found")
  })

  it("should accept summary option", async () => {
    const result = await runCli(["log", "--summary"])
    expect(result.stdout).toContain("No data found")
  })

  it("should accept filter expression", async () => {
    const result = await runCli(["log", "--filter", ".stepNumber > 1"])
    expect(result.stdout).toContain("No data found")
  })
})
