import { describe, expect, it } from "vitest"
import { assertEventSequenceContains } from "../lib/assertions.js"
import { parseEvents } from "../lib/event-parser.js"
import { runCli, runExpert } from "../lib/runner.js"

describe.concurrent("Runtime Selection", () => {
  it("should run with local runtime", async () => {
    const result = await runCli(
      [
        "run",
        "--config",
        "./e2e/experts/special-tools.toml",
        "--runtime",
        "local",
        "e2e-special-tools",
        "Use attemptCompletion to say hello",
      ],
      { timeout: 120000 },
    )
    expect(result.exitCode).toBe(0)
    const events = parseEvents(result.stdout)
    expect(assertEventSequenceContains(events, ["startRun", "completeRun"]).passed).toBe(true)
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
    if (result.exitCode === 0) {
      const events = parseEvents(result.stdout)
      expect(assertEventSequenceContains(events, ["startRun", "completeRun"]).passed).toBe(true)
    } else {
      expect(result.stderr).toMatch(
        /not installed|prerequisites|not found|failed with exit code|timed out/i,
      )
    }
  })

  it("should show helpful error or succeed for claude-code", async () => {
    const result = await runCli(
      [
        "run",
        "--config",
        "./e2e/experts/special-tools.toml",
        "--runtime",
        "claude-code",
        "e2e-special-tools",
        "echo test",
      ],
      { timeout: 120000 },
    )
    if (result.exitCode === 0) {
      const events = parseEvents(result.stdout)
      expect(assertEventSequenceContains(events, ["startRun", "completeRun"]).passed).toBe(true)
    } else {
      expect(result.stderr).toMatch(
        /not installed|prerequisites|not found|invalid api key|authentication/i,
      )
    }
  })

  it("should show helpful error or succeed for gemini", async () => {
    const result = await runCli(
      [
        "run",
        "--config",
        "./e2e/experts/special-tools.toml",
        "--runtime",
        "gemini",
        "e2e-special-tools",
        "echo test",
      ],
      { timeout: 120000 },
    )
    if (result.exitCode === 0) {
      const events = parseEvents(result.stdout)
      expect(assertEventSequenceContains(events, ["startRun", "completeRun"]).passed).toBe(true)
    } else {
      expect(result.stderr).toMatch(/not installed|prerequisites|API_KEY/i)
    }
  })

  it("should show helpful error or succeed for docker", async () => {
    const result = await runCli(
      [
        "run",
        "--config",
        "./e2e/experts/special-tools.toml",
        "--runtime",
        "docker",
        "e2e-special-tools",
        "echo test",
      ],
      { timeout: 120000 },
    )
    if (result.exitCode === 0) {
      const events = parseEvents(result.stdout)
      expect(assertEventSequenceContains(events, ["startRun", "completeRun"]).passed).toBe(true)
    } else {
      expect(result.stderr).toMatch(/not installed|prerequisites|not found|docker/i)
    }
  })

  it("should use runtime from perstack.toml when --runtime not specified", async () => {
    const result = await runExpert("e2e-global-runtime", "Say hello", {
      configPath: "./e2e/experts/global-runtime.toml",
      timeout: 120000,
    })
    expect(assertEventSequenceContains(result.events, ["startRun", "completeRun"]).passed).toBe(
      true,
    )
  })
})
