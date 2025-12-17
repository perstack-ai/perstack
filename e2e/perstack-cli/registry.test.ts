import { describe, expect, it } from "vitest"
import { runCli } from "../lib/runner.js"

const CONFIG = "./e2e/experts/error-handling.toml"

describe.concurrent("Registry", () => {
  it("should fail gracefully for nonexistent remote expert", async () => {
    const result = await runCli([
      "run",
      "--runtime",
      "local",
      "@nonexistent-user/nonexistent-expert",
      "test query",
    ])
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toMatch(/not found|does not exist|failed/i)
  })

  it("should fail gracefully for invalid expert key format", async () => {
    const result = await runCli(["run", "--runtime", "local", "@invalid", "test query"])
    expect(result.exitCode).toBe(1)
  })

  it("should fail gracefully when delegating to nonexistent remote expert", async () => {
    const result = await runCli([
      "run",
      "--runtime",
      "local",
      "--config",
      CONFIG,
      "e2e-invalid-delegate",
      "test",
    ])
    expect(result.exitCode).not.toBe(0)
  })
})
