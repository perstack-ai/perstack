/**
 * Runtime Selection E2E Tests
 *
 * Tests that perstack correctly handles different runtime environments:
 * - local: Direct execution on host machine
 * - docker: Containerized execution with network isolation
 * - cursor: Cursor IDE integration
 * - claude-code: Claude Code integration
 * - gemini: Gemini CLI integration
 *
 * Also tests runtime configuration via TOML and CLI argument validation.
 *
 * TOML: e2e/experts/special-tools.toml, e2e/experts/global-runtime.toml
 */
import { describe, expect, it } from "vitest"
import { assertEventSequenceContains } from "../lib/assertions.js"
import { parseEvents } from "../lib/event-parser.js"
import {
  isClaudeAvailable,
  isCursorAvailable,
  isDockerAvailable,
  isGeminiAvailable,
} from "../lib/prerequisites.js"
import { runCli, withEventParsing } from "../lib/runner.js"

const CONFIG = "./e2e/experts/special-tools.toml"
const GLOBAL_RUNTIME_CONFIG = "./e2e/experts/global-runtime.toml"
// LLM API calls require extended timeout beyond the default 30s
const LLM_TIMEOUT = 120000

describe.concurrent("Runtime Selection", () => {
  // ─────────────────────────────────────────────────────────────────────────
  // Core Runtime Tests
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Verifies basic local runtime execution.
   * Local runtime runs directly on host without containerization.
   */
  it("should run with local runtime", async () => {
    const result = await runCli(
      [
        "run",
        "--config",
        CONFIG,
        "--runtime",
        "local",
        "e2e-special-tools",
        "Use attemptCompletion to say hello",
      ],
      { timeout: LLM_TIMEOUT },
    )
    expect(result.exitCode).toBe(0)
    const events = parseEvents(result.stdout)
    expect(assertEventSequenceContains(events, ["startRun", "completeRun"]).passed).toBe(true)
  })

  /**
   * Verifies that invalid runtime names are rejected with exit code 1.
   */
  it("should reject invalid runtime names", async () => {
    const result = await runCli([
      "run",
      "--config",
      CONFIG,
      "--runtime",
      "invalid-runtime",
      "e2e-special-tools",
      "echo test",
    ])
    expect(result.exitCode).toBe(1)
  })

  // ─────────────────────────────────────────────────────────────────────────
  // IDE Integration Runtime Tests (conditional)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Verifies Cursor IDE runtime integration.
   * Skipped if Cursor is not available.
   */
  it.runIf(isCursorAvailable())("should run with cursor runtime", async () => {
    const result = await runCli(
      ["run", "--config", CONFIG, "--runtime", "cursor", "e2e-special-tools", "echo test"],
      { timeout: LLM_TIMEOUT },
    )
    expect(result.exitCode).toBe(0)
    const events = parseEvents(result.stdout)
    expect(assertEventSequenceContains(events, ["startRun", "completeRun"]).passed).toBe(true)
  })

  /**
   * Verifies Claude Code runtime integration.
   * Skipped if Claude Code is not available.
   */
  it.runIf(isClaudeAvailable())("should run with claude-code runtime", async () => {
    const result = await runCli(
      ["run", "--config", CONFIG, "--runtime", "claude-code", "e2e-special-tools", "echo test"],
      { timeout: LLM_TIMEOUT },
    )
    expect(result.exitCode).toBe(0)
    const events = parseEvents(result.stdout)
    expect(assertEventSequenceContains(events, ["startRun", "completeRun"]).passed).toBe(true)
  })

  /**
   * Verifies Gemini CLI runtime integration.
   * Uses simpler config to avoid timeout from heavy tool calls.
   * Skipped if Gemini is not available.
   */
  it.runIf(isGeminiAvailable())("should run with gemini runtime", async () => {
    // Gemini uses a simpler config to avoid timeout from heavy tool calls
    const result = await runCli(
      [
        "run",
        "--config",
        GLOBAL_RUNTIME_CONFIG,
        "--runtime",
        "gemini",
        "e2e-global-runtime",
        "Say hello",
      ],
      { timeout: LLM_TIMEOUT },
    )
    expect(result.exitCode).toBe(0)
    const events = parseEvents(result.stdout)
    expect(assertEventSequenceContains(events, ["startRun", "completeRun"]).passed).toBe(true)
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Docker Runtime Test
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Verifies Docker containerized runtime.
   * Requires EXA_API_KEY env for exa skill inside container.
   * Skipped if Docker is not available.
   */
  it.runIf(isDockerAvailable())("should run with docker runtime", async () => {
    const result = await runCli(
      [
        "run",
        "--config",
        CONFIG,
        "--runtime",
        "docker",
        "--env",
        "EXA_API_KEY",
        "e2e-special-tools",
        "Use attemptCompletion to say hello",
      ],
      { timeout: LLM_TIMEOUT },
    )
    expect(result.exitCode).toBe(0)
    const events = parseEvents(result.stdout)
    expect(assertEventSequenceContains(events, ["startRun", "completeRun"]).passed).toBe(true)
  })

  // ─────────────────────────────────────────────────────────────────────────
  // TOML Configuration Test
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Verifies that runtime can be specified in TOML configuration.
   * When --runtime is not provided, uses runtime from perstack.toml.
   */
  it("should use runtime from perstack.toml when --runtime not specified", async () => {
    const cmdResult = await runCli(
      ["run", "--config", GLOBAL_RUNTIME_CONFIG, "e2e-global-runtime", "Say hello"],
      { timeout: LLM_TIMEOUT },
    )
    const result = withEventParsing(cmdResult)
    expect(assertEventSequenceContains(result.events, ["startRun", "completeRun"]).passed).toBe(
      true,
    )
  })
})
