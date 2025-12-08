import { describe, expect, it } from "vitest"
import { runCli } from "./lib/runner.js"

describe("CLI publish", () => {
  it("should output JSON payload for valid expert with --dry-run", async () => {
    const result = await runCli(["publish", "tic-tac-toe", "--dry-run"])
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toBeTruthy()
  })

  it("should fail for nonexistent expert", async () => {
    const result = await runCli(["publish", "nonexistent", "--dry-run"])
    expect(result.exitCode).toBe(1)
  })

  it("should fail with nonexistent config file", async () => {
    const result = await runCli([
      "publish",
      "tic-tac-toe",
      "--dry-run",
      "--config",
      "nonexistent.toml",
    ])
    expect(result.exitCode).toBe(1)
  })

  it("should fail when no config in directory", async () => {
    const result = await runCli(["publish", "tic-tac-toe", "--dry-run"], { cwd: "/tmp" })
    expect(result.exitCode).toBe(1)
  })
})

