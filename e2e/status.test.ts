import { describe, expect, it } from "vitest"
import { runCli } from "./lib/runner.js"

describe("CLI status", () => {
  it("should fail without version", async () => {
    const result = await runCli(["status", "no-version", "available"])
    expect(result.exitCode).toBe(1)
  })

  it("should fail with invalid status value", async () => {
    const result = await runCli(["status", "expert@1.0.0", "invalid-status"])
    expect(result.exitCode).toBe(1)
  })
})

