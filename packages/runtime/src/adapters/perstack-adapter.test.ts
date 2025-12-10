import type { Expert } from "@perstack/core"
import { describe, expect, it } from "vitest"
import { PerstackAdapter } from "./perstack-adapter.js"

describe("@perstack/runtime: PerstackAdapter", () => {
  it("has correct name", () => {
    const adapter = new PerstackAdapter()
    expect(adapter.name).toBe("perstack")
  })

  it("prerequisites always pass", async () => {
    const adapter = new PerstackAdapter()
    const result = await adapter.checkPrerequisites()
    expect(result.ok).toBe(true)
  })

  it("convertExpert returns instruction unchanged", () => {
    const adapter = new PerstackAdapter()
    const expert: Expert = {
      key: "test",
      name: "test",
      version: "1.0.0",
      instruction: "Test instruction",
      skills: {},
      delegates: [],
      tags: [],
      runtime: ["perstack"],
    }
    const config = adapter.convertExpert(expert)
    expect(config.instruction).toBe("Test instruction")
  })
})
