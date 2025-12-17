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

  it.runIf(isCursorAvailable())("should run with cursor runtime", async () => {
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
    expect(result.exitCode).toBe(0)
    const events = parseEvents(result.stdout)
    expect(assertEventSequenceContains(events, ["startRun", "completeRun"]).passed).toBe(true)
  })

  it.runIf(isClaudeAvailable())("should run with claude-code runtime", async () => {
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
    expect(result.exitCode).toBe(0)
    const events = parseEvents(result.stdout)
    expect(assertEventSequenceContains(events, ["startRun", "completeRun"]).passed).toBe(true)
  })

  it.runIf(isGeminiAvailable())("should run with gemini runtime", async () => {
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
    expect(result.exitCode).toBe(0)
    const events = parseEvents(result.stdout)
    expect(assertEventSequenceContains(events, ["startRun", "completeRun"]).passed).toBe(true)
  })

  it.runIf(isDockerAvailable())("should run with docker runtime", async () => {
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
    expect(result.exitCode).toBe(0)
    const events = parseEvents(result.stdout)
    expect(assertEventSequenceContains(events, ["startRun", "completeRun"]).passed).toBe(true)
  })

  it("should use runtime from perstack.toml when --runtime not specified", async () => {
    const cmdResult = await runCli(
      ["run", "--config", "./e2e/experts/global-runtime.toml", "e2e-global-runtime", "Say hello"],
      { timeout: 120000 },
    )
    const result = withEventParsing(cmdResult)
    expect(assertEventSequenceContains(result.events, ["startRun", "completeRun"]).passed).toBe(
      true,
    )
  })
})
