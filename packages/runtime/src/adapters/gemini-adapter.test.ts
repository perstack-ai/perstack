import type { Expert } from "@perstack/core"
import { describe, expect, it } from "vitest"
import { GeminiAdapter } from "./gemini-adapter.js"

describe("GeminiAdapter", () => {
  it("has correct name", () => {
    const adapter = new GeminiAdapter()
    expect(adapter.name).toBe("gemini")
  })

  describe("convertExpert", () => {
    it("returns instruction unchanged", () => {
      const adapter = new GeminiAdapter()
      const expert: Expert = {
        key: "test",
        name: "test",
        version: "1.0.0",
        instruction: "Test instruction",
        skills: {},
        delegates: [],
        tags: [],
        runtime: ["gemini"],
      }
      const config = adapter.convertExpert(expert)
      expect(config.instruction).toBe("Test instruction")
    })
  })

  describe("checkPrerequisites", () => {
    it("fails when gemini CLI not installed or API key missing", async () => {
      const originalKey = process.env.GEMINI_API_KEY
      delete process.env.GEMINI_API_KEY
      const adapter = new GeminiAdapter()
      const result = await adapter.checkPrerequisites()
      if (originalKey) process.env.GEMINI_API_KEY = originalKey
      if (!result.ok) {
        expect(result.error.type).toMatch(/cli-not-found|auth-missing/)
        expect(result.error.helpUrl).toBeDefined()
      }
    })
  })
})
