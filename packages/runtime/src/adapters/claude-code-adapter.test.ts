import type { Expert } from "@perstack/core"
import { describe, expect, it } from "vitest"
import { ClaudeCodeAdapter } from "./claude-code-adapter.js"

describe("ClaudeCodeAdapter", () => {
  it("has correct name", () => {
    const adapter = new ClaudeCodeAdapter()
    expect(adapter.name).toBe("claude-code")
  })

  describe("convertExpert", () => {
    it("returns instruction unchanged", () => {
      const adapter = new ClaudeCodeAdapter()
      const expert: Expert = {
        key: "test",
        name: "test",
        version: "1.0.0",
        instruction: "Test instruction",
        skills: {},
        delegates: [],
        tags: [],
        runtime: ["claude-code"],
      }
      const config = adapter.convertExpert(expert)
      expect(config.instruction).toBe("Test instruction")
    })
  })

  describe("checkPrerequisites", () => {
    it("fails when claude CLI not installed", async () => {
      const adapter = new ClaudeCodeAdapter()
      const result = await adapter.checkPrerequisites()
      if (!result.ok) {
        expect(result.error.type).toBe("cli-not-found")
        expect(result.error.helpUrl).toBeDefined()
      }
    })
  })
})
