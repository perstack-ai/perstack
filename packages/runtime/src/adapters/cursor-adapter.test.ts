import type { Expert } from "@perstack/core"
import { describe, expect, it } from "vitest"
import { CursorAdapter } from "./cursor-adapter.js"

describe("CursorAdapter", () => {
  it("has correct name", () => {
    const adapter = new CursorAdapter()
    expect(adapter.name).toBe("cursor")
  })

  describe("convertExpert", () => {
    it("returns instruction unchanged", () => {
      const adapter = new CursorAdapter()
      const expert: Expert = {
        key: "test",
        name: "test",
        version: "1.0.0",
        instruction: "Test instruction",
        skills: {},
        delegates: [],
        tags: [],
        runtime: ["cursor"],
      }
      const config = adapter.convertExpert(expert)
      expect(config.instruction).toBe("Test instruction")
    })
  })

  describe("checkPrerequisites", () => {
    it("fails when cursor-agent not installed", async () => {
      const adapter = new CursorAdapter()
      const result = await adapter.checkPrerequisites()
      if (!result.ok) {
        expect(result.error.type).toBe("cli-not-found")
        expect(result.error.helpUrl).toBeDefined()
      }
    })
  })
})
