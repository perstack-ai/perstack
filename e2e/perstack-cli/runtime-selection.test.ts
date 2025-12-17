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
const TIMEOUT = 120000

describe.concurrent("Runtime Selection", () => {
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
      { timeout: TIMEOUT },
    )
    expect(result.exitCode).toBe(0)
    const events = parseEvents(result.stdout)
    expect(assertEventSequenceContains(events, ["startRun", "completeRun"]).passed).toBe(true)
  })

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

  it.runIf(isCursorAvailable())("should run with cursor runtime", async () => {
    const result = await runCli(
      ["run", "--config", CONFIG, "--runtime", "cursor", "e2e-special-tools", "echo test"],
      { timeout: TIMEOUT },
    )
    expect(result.exitCode).toBe(0)
    const events = parseEvents(result.stdout)
    expect(assertEventSequenceContains(events, ["startRun", "completeRun"]).passed).toBe(true)
  })

  it.runIf(isClaudeAvailable())("should run with claude-code runtime", async () => {
    const result = await runCli(
      ["run", "--config", CONFIG, "--runtime", "claude-code", "e2e-special-tools", "echo test"],
      { timeout: TIMEOUT },
    )
    expect(result.exitCode).toBe(0)
    const events = parseEvents(result.stdout)
    expect(assertEventSequenceContains(events, ["startRun", "completeRun"]).passed).toBe(true)
  })

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
      { timeout: TIMEOUT },
    )
    expect(result.exitCode).toBe(0)
    const events = parseEvents(result.stdout)
    expect(assertEventSequenceContains(events, ["startRun", "completeRun"]).passed).toBe(true)
  })

  it.runIf(isDockerAvailable())("should run with docker runtime", async () => {
    // --env EXA_API_KEY is required for exa skill to work inside Docker container
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
      { timeout: TIMEOUT },
    )
    expect(result.exitCode).toBe(0)
    const events = parseEvents(result.stdout)
    expect(assertEventSequenceContains(events, ["startRun", "completeRun"]).passed).toBe(true)
  })

  it("should use runtime from perstack.toml when --runtime not specified", async () => {
    const cmdResult = await runCli(
      ["run", "--config", GLOBAL_RUNTIME_CONFIG, "e2e-global-runtime", "Say hello"],
      { timeout: TIMEOUT },
    )
    const result = withEventParsing(cmdResult)
    expect(assertEventSequenceContains(result.events, ["startRun", "completeRun"]).passed).toBe(
      true,
    )
  })
})
