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
      expect(result).toStrictEqual({
        nextThoughtNeeded: true,
        thoughtHistoryLength: 1,
      })
    })
  })
})
