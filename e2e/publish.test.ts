import { describe, expect, it } from "vitest"
import { runCli } from "./lib/runner.js"

const CONFIG_PATH = "./e2e/experts/cli-commands.toml"

describe("CLI publish", () => {
  it("should output JSON payload for valid expert with --dry-run", async () => {
    const result = await runCli([
      "publish",
      "e2e-publish-test",
      "--dry-run",
      "--config",
      CONFIG_PATH,
    ])
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toBeTruthy()
  })

  it("should fail for nonexistent expert", async () => {
    const result = await runCli(["publish", "nonexistent", "--dry-run", "--config", CONFIG_PATH])
    expect(result.exitCode).toBe(1)
  })

  it("should fail with nonexistent config file", async () => {
    const result = await runCli([
      "publish",
      "e2e-publish-test",
      "--dry-run",
      "--config",
      "nonexistent.toml",
    ])
    expect(result.exitCode).toBe(1)
  })

  it("should fail when no config in directory", async () => {
    const result = await runCli(["publish", "e2e-publish-test", "--dry-run"], { cwd: "/tmp" })
    expect(result.exitCode).toBe(1)
  })
})
