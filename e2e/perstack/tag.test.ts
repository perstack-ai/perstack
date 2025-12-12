import { describe, expect, it } from "vitest"
import { runCli } from "../lib/runner.js"

describe("CLI tag", () => {
  it("should fail without version", async () => {
    const result = await runCli(["tag", "no-version", "tag1"])
    expect(result.exitCode).toBe(1)
  })

  it("should fail without tags", async () => {
    const result = await runCli(["tag", "expert@1.0.0"])
    expect(result.exitCode).toBe(1)
  })
})
