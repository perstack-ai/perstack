import { describe, expect, it } from "vitest"
import { runCli } from "../lib/runner.js"

describe("Registry", () => {
  describe("Remote expert resolution", () => {
    it("should fail gracefully for nonexistent remote expert", async () => {
      const result = await runCli(
        ["run", "@nonexistent-user/nonexistent-expert", "test query"],
        { timeout: 60000 },
      )
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toMatch(/not found|does not exist|failed/i)
    }, 120000)

    it("should fail gracefully for invalid expert key format", async () => {
      const result = await runCli(["run", "@invalid", "test query"], { timeout: 30000 })
      expect(result.exitCode).toBe(1)
    }, 60000)
  })

  describe("Remote delegation", () => {
    it("should fail gracefully when delegating to nonexistent remote expert", async () => {
      const result = await runCli(
        [
          "run",
          "--config",
          "./e2e/experts/error-handling.toml",
          "e2e-invalid-delegate",
          "test",
        ],
        { timeout: 60000 },
      )
      expect(result.exitCode).not.toBe(0)
    }, 120000)
  })
})
