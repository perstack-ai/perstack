import { describe, expect, it } from "vitest"
import { assertEventSequenceContains } from "../lib/assertions.js"
import { runExpertWithRuntimeCli, runRuntimeCli } from "../lib/runner.js"

describe("perstack-runtime CLI", () => {
  describe("basic commands", () => {
    it("should show version", async () => {
      const result = await runRuntimeCli(["--version"])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toMatch(/^\d+\.\d+\.\d+/)
    })

    it("should show help", async () => {
      const result = await runRuntimeCli(["--help"])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain("perstack-runtime")
    })

    it("should show run command help", async () => {
      const result = await runRuntimeCli(["run", "--help"])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain("expertKey")
      expect(result.stdout).toContain("query")
    })
  })

  describe("run command validation", () => {
    it("should fail without arguments", async () => {
      const result = await runRuntimeCli(["run"])
      expect(result.exitCode).toBe(1)
    })

    it("should fail with only expert key", async () => {
      const result = await runRuntimeCli(["run", "expertOnly"])
      expect(result.exitCode).toBe(1)
    })

    it("should fail for nonexistent expert", async () => {
      const result = await runRuntimeCli(["run", "nonexistent-expert", "test query"])
      expect(result.exitCode).toBe(1)
    })

    it("should fail with nonexistent config file", async () => {
      const result = await runRuntimeCli(["run", "expert", "query", "--config", "nonexistent.toml"])
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain("nonexistent.toml")
    })
  })

  describe("expert execution", () => {
    it("should run expert and output JSON events", async () => {
      const result = await runExpertWithRuntimeCli("e2e-global-runtime", "Say hello", {
        configPath: "./e2e/experts/global-runtime.toml",
        timeout: 120000,
      })
      expect(result.exitCode).toBe(0)
      expect(result.events.length).toBeGreaterThan(0)
      expect(assertEventSequenceContains(result.events, ["startRun", "completeRun"]).passed).toBe(
        true,
      )
    })
  })
})
