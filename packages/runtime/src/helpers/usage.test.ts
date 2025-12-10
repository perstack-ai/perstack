import type { Usage } from "@perstack/core"
import type { GenerateTextResult, ToolSet } from "ai"
import { describe, expect, it } from "vitest"
import { createEmptyUsage, sumUsage, usageFromGenerateTextResult } from "./usage.js"

describe("@perstack/runtime: usage", () => {
  describe("createEmptyUsage()", () => {
    it("returns empty usage with all tokens set to zero", () => {
      const usage = createEmptyUsage()
      expect(usage).toStrictEqual({
        inputTokens: 0,
        outputTokens: 0,
        reasoningTokens: 0,
        totalTokens: 0,
        cachedInputTokens: 0,
      })
    })

    it("returns a new object each time", () => {
      const usage1 = createEmptyUsage()
      const usage2 = createEmptyUsage()
      expect(usage1).not.toBe(usage2)
      expect(usage1).toEqual(usage2)
    })

    it("has correct property types", () => {
      const usage = createEmptyUsage()
      expect(typeof usage.inputTokens).toBe("number")
      expect(typeof usage.outputTokens).toBe("number")
      expect(typeof usage.reasoningTokens).toBe("number")
      expect(typeof usage.totalTokens).toBe("number")
      expect(typeof usage.cachedInputTokens).toBe("number")
    })
  })

  describe("usageFromGenerateTextResult()", () => {
    it("extracts usage from generate text result", () => {
      const result = {
        text: "Hello, world!",
        usage: {
          inputTokens: 100,
          outputTokens: 200,
          reasoningTokens: 0,
          totalTokens: 300,
          cachedInputTokens: 50,
        },
      } as unknown as GenerateTextResult<ToolSet, never>
      const usage = usageFromGenerateTextResult(result)
      expect(usage).toStrictEqual({
        inputTokens: 100,
        outputTokens: 200,
        reasoningTokens: 0,
        totalTokens: 300,
        cachedInputTokens: 50,
      })
    })

    it("handles undefined values with defaults", () => {
      const result = {
        text: "Hello",
        usage: {},
      } as unknown as GenerateTextResult<ToolSet, never>
      const usage = usageFromGenerateTextResult(result)
      expect(usage).toStrictEqual({
        inputTokens: 0,
        outputTokens: 0,
        reasoningTokens: 0,
        totalTokens: 0,
        cachedInputTokens: 0,
      })
    })
  })

  describe("sumUsage()", () => {
    it("sums two usage objects correctly", () => {
      const usage1: Usage = {
        inputTokens: 100,
        outputTokens: 200,
        reasoningTokens: 0,
        totalTokens: 300,
        cachedInputTokens: 50,
      }
      const usage2: Usage = {
        inputTokens: 150,
        outputTokens: 100,
        reasoningTokens: 10,
        totalTokens: 250,
        cachedInputTokens: 40,
      }
      const result = sumUsage(usage1, usage2)
      expect(result).toStrictEqual({
        inputTokens: 250,
        outputTokens: 300,
        reasoningTokens: 10,
        totalTokens: 550,
        cachedInputTokens: 90,
      })
    })
  })
})
