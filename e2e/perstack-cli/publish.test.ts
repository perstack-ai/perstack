import { describe, expect, it } from "vitest"
import { runCli } from "../lib/runner.js"

const CONFIG_PATH = "./e2e/experts/cli-commands.toml"

describe("Publish Expert", () => {
  describe("Preview publish", () => {
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

  describe("Unpublish expert", () => {
    it("should fail without version", async () => {
      const result = await runCli(["unpublish", "no-version", "--force"])
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain("version")
    })

    it("should fail without --force when version provided", async () => {
      const result = await runCli(["unpublish", "expert@1.0.0"])
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain("--force")
    })
  })

  describe("Tag expert", () => {
    it("should fail without version", async () => {
      const result = await runCli(["tag", "no-version", "tag1"])
      expect(result.exitCode).toBe(1)
    })

    it("should fail without tags", async () => {
      const result = await runCli(["tag", "expert@1.0.0"])
      expect(result.exitCode).toBe(1)
    })
  })

  describe("Change status", () => {
    it("should fail without version", async () => {
      const result = await runCli(["status", "no-version", "available"])
      expect(result.exitCode).toBe(1)
    })

    it("should fail without status value", async () => {
      const result = await runCli(["status", "expert@1.0.0"])
      expect(result.exitCode).toBe(1)
    })

    it("should fail with invalid status value", async () => {
      const result = await runCli(["status", "expert@1.0.0", "invalid-status"])
      expect(result.exitCode).toBe(1)
    })
  })
})
