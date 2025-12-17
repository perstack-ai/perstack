import { describe, expect, it } from "vitest"
import { runCli } from "../lib/runner.js"

describe.concurrent("CLI Validation", () => {
  it("should fail without arguments", async () => {
    const result = await runCli(["run", "--runtime", "local"])
    expect(result.exitCode).toBe(1)
  })

  it("should fail with only expert key", async () => {
    const result = await runCli(["run", "--runtime", "local", "expertOnly"])
    expect(result.exitCode).toBe(1)
  })

  it("should fail for nonexistent expert", async () => {
    const result = await runCli(["run", "--runtime", "local", "nonexistent-expert", "test query"])
    expect(result.exitCode).toBe(1)
  })

  it("should fail with nonexistent config file", async () => {
    const result = await runCli([
      "run",
      "--runtime",
      "local",
      "--config",
      "nonexistent.toml",
      "expert",
      "query",
    ])
    expect(result.exitCode).toBe(1)
  })

  it("should fail when --resume-from is used without --continue-job", async () => {
    const result = await runCli([
      "run",
      "--runtime",
      "local",
      "--resume-from",
      "checkpoint-123",
      "test-expert",
      "test query",
    ])
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain("--resume-from requires --continue-job")
  })

  it("should reject invalid runtime name", async () => {
    const result = await runCli([
      "run",
      "--runtime",
      "invalid-runtime",
      "test-expert",
      "test query",
    ])
    expect(result.exitCode).toBe(1)
  })
  it("should fail with clear message for nonexistent delegate", async () => {
    const result = await runCli(
      [
        "run",
        "--config",
        "./e2e/experts/error-handling.toml",
        "--runtime",
        "local",
        "e2e-invalid-delegate",
        "test",
      ],
      { timeout: 60000 },
    )
    expect(result.exitCode).not.toBe(0)
    expect(result.stderr).toMatch(/not found|nonexistent/i)
  })
})
