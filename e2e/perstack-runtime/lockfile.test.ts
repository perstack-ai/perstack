/**
 * Lockfile E2E Tests
 *
 * Tests lockfile generation and usage:
 * - `perstack install` generates valid lockfile
 * - Runtime uses lockfile for instant startup
 *
 * TOML: e2e/experts/lockfile.toml
 */
import { existsSync, readFileSync, unlinkSync } from "node:fs"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { assertEventSequenceContains } from "../lib/assertions.js"
import { runCli, runRuntimeCli, withEventParsing } from "../lib/runner.js"

const LOCKFILE_CONFIG = "./e2e/experts/lockfile.toml"
const LOCKFILE_PATH = "./e2e/experts/perstack.lock"
const INSTALL_TIMEOUT = 60000
const LLM_TIMEOUT = 120000

describe("Lockfile", () => {
  beforeEach(() => {
    if (existsSync(LOCKFILE_PATH)) {
      unlinkSync(LOCKFILE_PATH)
    }
  })

  afterEach(() => {
    if (existsSync(LOCKFILE_PATH)) {
      unlinkSync(LOCKFILE_PATH)
    }
  })

  it(
    "should generate lockfile with perstack install",
    async () => {
      const cmdResult = await runCli(["install", "--config", LOCKFILE_CONFIG], {
        timeout: INSTALL_TIMEOUT,
      })
      expect(cmdResult.exitCode).toBe(0)
      expect(cmdResult.stdout).toContain("Resolving experts")
      expect(cmdResult.stdout).toContain("Collecting tool definitions")
      expect(cmdResult.stdout).toContain("Generated")
      expect(existsSync(LOCKFILE_PATH)).toBe(true)
      const lockfileContent = readFileSync(LOCKFILE_PATH, "utf-8")
      expect(lockfileContent).toContain('version = "1"')
      expect(lockfileContent).toContain("generatedAt")
      expect(lockfileContent).toContain("e2e-lockfile")
      expect(lockfileContent).toContain("healthCheck")
      expect(lockfileContent).toContain("attemptCompletion")
    },
    INSTALL_TIMEOUT,
  )

  it(
    "should run with lockfile present",
    async () => {
      const installResult = await runCli(["install", "--config", LOCKFILE_CONFIG], {
        timeout: INSTALL_TIMEOUT,
      })
      expect(installResult.exitCode).toBe(0)
      expect(existsSync(LOCKFILE_PATH)).toBe(true)
      const runResult = await runRuntimeCli(
        ["run", "--config", LOCKFILE_CONFIG, "e2e-lockfile", "Test with lockfile"],
        { timeout: LLM_TIMEOUT },
      )
      const result = withEventParsing(runResult)
      expect(result.exitCode).toBe(0)
      expect(assertEventSequenceContains(result.events, ["startRun", "completeRun"]).passed).toBe(
        true,
      )
    },
    INSTALL_TIMEOUT + LLM_TIMEOUT,
  )

  it(
    "should run without lockfile (fallback)",
    async () => {
      expect(existsSync(LOCKFILE_PATH)).toBe(false)
      const runResult = await runRuntimeCli(
        ["run", "--config", LOCKFILE_CONFIG, "e2e-lockfile", "Test without lockfile"],
        { timeout: LLM_TIMEOUT },
      )
      const result = withEventParsing(runResult)
      expect(result.exitCode).toBe(0)
      expect(assertEventSequenceContains(result.events, ["startRun", "completeRun"]).passed).toBe(
        true,
      )
    },
    LLM_TIMEOUT,
  )

  it(
    "should contain tool input schemas in lockfile",
    async () => {
      const cmdResult = await runCli(["install", "--config", LOCKFILE_CONFIG], {
        timeout: INSTALL_TIMEOUT,
      })
      expect(cmdResult.exitCode).toBe(0)
      const lockfileContent = readFileSync(LOCKFILE_PATH, "utf-8")
      expect(lockfileContent).toContain("inputSchema")
      expect(lockfileContent).toContain("skillName")
      expect(lockfileContent).toContain("@perstack/base")
    },
    INSTALL_TIMEOUT,
  )
})
