import { describe, expect, it } from "vitest"
import { assertEventSequenceContains } from "../lib/assertions.js"
import { runRuntimeCli, withEventParsing } from "../lib/runner.js"

describe("CLI Options", () => {
  describe("Model configuration", () => {
    it("should accept --provider option", async () => {
      const result = await runRuntimeCli([
        "run",
        "--config",
        "./e2e/experts/global-runtime.toml",
        "--provider",
        "anthropic",
        "e2e-global-runtime",
        "Say hello",
      ])
      expect(result.exitCode).toBe(0)
    }, 120000)

    it("should accept --model option", async () => {
      const result = await runRuntimeCli([
        "run",
        "--config",
        "./e2e/experts/global-runtime.toml",
        "--model",
        "claude-sonnet-4-5",
        "e2e-global-runtime",
        "Say hello",
      ])
      expect(result.exitCode).toBe(0)
    }, 120000)

    it("should accept --temperature option", async () => {
      const result = await runRuntimeCli([
        "run",
        "--config",
        "./e2e/experts/global-runtime.toml",
        "--temperature",
        "0.5",
        "e2e-global-runtime",
        "Say hello",
      ])
      expect(result.exitCode).toBe(0)
    }, 120000)
  })

  describe("Execution limits", () => {
    it("should accept --max-steps option", async () => {
      const result = await runRuntimeCli([
        "run",
        "--config",
        "./e2e/experts/global-runtime.toml",
        "--max-steps",
        "10",
        "e2e-global-runtime",
        "Say hello",
      ])
      expect(result.exitCode).toBe(0)
    }, 120000)

    it("should accept --max-retries option", async () => {
      const result = await runRuntimeCli([
        "run",
        "--config",
        "./e2e/experts/global-runtime.toml",
        "--max-retries",
        "3",
        "e2e-global-runtime",
        "Say hello",
      ])
      expect(result.exitCode).toBe(0)
    }, 120000)

    it("should accept --timeout option", async () => {
      const result = await runRuntimeCli([
        "run",
        "--config",
        "./e2e/experts/global-runtime.toml",
        "--timeout",
        "120000",
        "e2e-global-runtime",
        "Say hello",
      ])
      expect(result.exitCode).toBe(0)
    }, 180000)
  })

  describe("Job identification", () => {
    it("should accept --job-id option", async () => {
      const cmdResult = await runRuntimeCli(
        [
          "run",
          "--config",
          "./e2e/experts/global-runtime.toml",
          "--job-id",
          "test-job-123",
          "e2e-global-runtime",
          "Say hello",
        ],
        { timeout: 120000 },
      )
      const result = withEventParsing(cmdResult)
      expect(result.exitCode).toBe(0)
      const startEvent = result.events.find((e) => e.type === "startRun")
      expect(startEvent).toBeDefined()
    }, 180000)

    it("should accept --run-id option", async () => {
      const cmdResult = await runRuntimeCli(
        [
          "run",
          "--config",
          "./e2e/experts/global-runtime.toml",
          "--run-id",
          "test-run-456",
          "e2e-global-runtime",
          "Say hello",
        ],
        { timeout: 120000 },
      )
      const result = withEventParsing(cmdResult)
      expect(result.exitCode).toBe(0)
      expect(assertEventSequenceContains(result.events, ["startRun", "completeRun"]).passed).toBe(
        true,
      )
    }, 180000)
  })

  describe("Environment configuration", () => {
    it("should accept --env-path option", async () => {
      const cmdResult = await runRuntimeCli(
        [
          "run",
          "--config",
          "./e2e/experts/global-runtime.toml",
          "--env-path",
          ".env",
          "e2e-global-runtime",
          "Say hello",
        ],
        { timeout: 120000 },
      )
      const result = withEventParsing(cmdResult)
      expect(result.exitCode).toBe(0)
    }, 180000)

    it("should accept --verbose option", async () => {
      const result = await runRuntimeCli([
        "run",
        "--config",
        "./e2e/experts/global-runtime.toml",
        "--verbose",
        "e2e-global-runtime",
        "Say hello",
      ])
      expect(result.exitCode).toBe(0)
    }, 120000)
  })
})
