import { describe, expect, it } from "vitest"
import { runRuntimeCli } from "../lib/runner.js"

describe.concurrent("CLI Validation", () => {
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
