import { describe, expect, it } from "vitest"
import { ClaudeCodeAdapter } from "./claude-code-adapter.js"
import { CursorAdapter } from "./cursor-adapter.js"
import { getAdapter, isAdapterAvailable } from "./factory.js"
import { GeminiAdapter } from "./gemini-adapter.js"
import { PerstackAdapter } from "./perstack-adapter.js"

describe("@perstack/runtime: adapter factory", () => {
  describe("getAdapter", () => {
    it("returns PerstackAdapter for perstack", () => {
      const adapter = getAdapter("perstack")
      expect(adapter).toBeInstanceOf(PerstackAdapter)
      expect(adapter.name).toBe("perstack")
    })

    it("returns CursorAdapter for cursor", () => {
      const adapter = getAdapter("cursor")
      expect(adapter).toBeInstanceOf(CursorAdapter)
      expect(adapter.name).toBe("cursor")
    })

    it("returns ClaudeCodeAdapter for claude-code", () => {
      const adapter = getAdapter("claude-code")
      expect(adapter).toBeInstanceOf(ClaudeCodeAdapter)
      expect(adapter.name).toBe("claude-code")
    })

    it("returns GeminiAdapter for gemini", () => {
      const adapter = getAdapter("gemini")
      expect(adapter).toBeInstanceOf(GeminiAdapter)
      expect(adapter.name).toBe("gemini")
    })
  })

  describe("isAdapterAvailable", () => {
    it("returns true for all supported runtimes", () => {
      expect(isAdapterAvailable("perstack")).toBe(true)
      expect(isAdapterAvailable("cursor")).toBe(true)
      expect(isAdapterAvailable("claude-code")).toBe(true)
      expect(isAdapterAvailable("gemini")).toBe(true)
    })
  })
})
