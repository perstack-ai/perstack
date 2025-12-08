import { describe, expect, it } from "vitest"
import { runCli } from "./lib/runner.js"

describe("CLI run", () => {
  it("should fail without arguments", async () => {
    const result = await runCli(["run"])
    expect(result.exitCode).toBe(1)
  })

  it("should fail with only expert key", async () => {
    const result = await runCli(["run", "expertOnly"])
    expect(result.exitCode).toBe(1)
  })

  it("should fail for nonexistent expert", async () => {
    const result = await runCli(["run", "nonexistent-expert", "test query"])
    expect(result.exitCode).toBe(1)
  })

  it("should fail with nonexistent config file", async () => {
    const result = await runCli(["run", "expert", "query", "--config", "nonexistent.toml"])
    expect(result.exitCode).toBe(1)
  })
})

