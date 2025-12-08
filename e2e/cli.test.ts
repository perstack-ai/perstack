import { describe, expect, it } from "vitest"
import { runCli } from "./lib/runner.js"

describe("CLI Help and Version", () => {
  it("should display help", async () => {
    const result = await runCli(["--help"])
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain("perstack")
  })

  it("should display version", async () => {
    const result = await runCli(["--version"])
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toMatch(/\d+\.\d+\.\d+/)
  })

  it("should display run help", async () => {
    const result = await runCli(["run", "--help"])
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain("run")
  })

  it("should display publish help", async () => {
    const result = await runCli(["publish", "--help"])
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain("publish")
  })

  it("should display unpublish help", async () => {
    const result = await runCli(["unpublish", "--help"])
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain("unpublish")
  })

  it("should display tag help", async () => {
    const result = await runCli(["tag", "--help"])
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain("tag")
  })

  it("should display status help", async () => {
    const result = await runCli(["status", "--help"])
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain("status")
  })
})

describe("Publish Dry Run", () => {
  it("should output JSON payload for valid expert", async () => {
    const result = await runCli(["publish", "tic-tac-toe", "--dry-run"])
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toBeTruthy()
  })

  it("should fail for nonexistent expert", async () => {
    const result = await runCli(["publish", "nonexistent", "--dry-run"])
    expect(result.exitCode).toBe(1)
  })
})

describe("Argument Validation", () => {
  it("should fail run without arguments", async () => {
    const result = await runCli(["run"])
    expect(result.exitCode).toBe(1)
  })

  it("should fail run with only expert key", async () => {
    const result = await runCli(["run", "expertOnly"])
    expect(result.exitCode).toBe(1)
  })

  it("should fail unpublish without version", async () => {
    const result = await runCli(["unpublish", "no-version", "--force"])
    expect(result.exitCode).toBe(1)
  })

  it("should fail tag without version", async () => {
    const result = await runCli(["tag", "no-version", "tag1"])
    expect(result.exitCode).toBe(1)
  })

  it("should fail status without version", async () => {
    const result = await runCli(["status", "no-version", "available"])
    expect(result.exitCode).toBe(1)
  })

  it("should fail status with invalid status value", async () => {
    const result = await runCli(["status", "expert@1.0.0", "invalid-status"])
    expect(result.exitCode).toBe(1)
  })

  it("should fail tag without tags", async () => {
    const result = await runCli(["tag", "expert@1.0.0"])
    expect(result.exitCode).toBe(1)
  })
})

describe("Config File Handling", () => {
  it("should fail with nonexistent config file", async () => {
    const result = await runCli(["publish", "tic-tac-toe", "--dry-run", "--config", "nonexistent.toml"])
    expect(result.exitCode).toBe(1)
  })

  it("should fail when no config in directory", async () => {
    const result = await runCli(["publish", "tic-tac-toe", "--dry-run"], { cwd: "/tmp" })
    expect(result.exitCode).toBe(1)
  })
})

describe("Run Command Error Handling", () => {
  it("should fail for nonexistent expert", async () => {
    const result = await runCli(["run", "nonexistent-expert", "test query"])
    expect(result.exitCode).toBe(1)
  })
})

