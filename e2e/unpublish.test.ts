import { describe, expect, it } from "vitest"
import { runCli } from "./lib/runner.js"

describe("CLI unpublish", () => {
  it("should fail without version", async () => {
    const result = await runCli(["unpublish", "no-version", "--force"])
    expect(result.exitCode).toBe(1)
  })
})

