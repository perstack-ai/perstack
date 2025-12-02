import { afterEach, describe, expect, it, vi } from "vitest"
import { think } from "./think.js"

describe("think tool", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("think functionality", () => {
    it("processes single thought with nextThoughtNeeded", async () => {
      const result = await think({
        thought: "I need to analyze this problem step by step",
        nextThoughtNeeded: true,
      })
      expect(result.nextThoughtNeeded).toBe(true)
      expect(result.thoughtHistoryLength).toBeGreaterThan(0)
    })

    it("processes thought without nextThoughtNeeded", async () => {
      const result = await think({
        thought: "Final conclusion reached",
      })
      expect(result.nextThoughtNeeded).toBeUndefined()
    })

    it("tracks thought history across multiple calls", async () => {
      const result1 = await think({ thought: "First thought", nextThoughtNeeded: true })
      const _result2 = await think({ thought: "Second thought", nextThoughtNeeded: true })
      const result3 = await think({ thought: "Third thought", nextThoughtNeeded: false })
      expect(result3.thoughtHistoryLength).toBeGreaterThan(result1.thoughtHistoryLength)
      expect(result3.nextThoughtNeeded).toBe(false)
    })
  })
})
