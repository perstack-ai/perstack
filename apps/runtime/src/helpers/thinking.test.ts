import { describe, expect, it } from "vitest"
import { extractThinkingParts, extractThinkingText, type ReasoningPart } from "./thinking.js"

describe("@perstack/runtime: thinking", () => {
  describe("extractThinkingParts", () => {
    it("returns empty array when reasoning is undefined", () => {
      expect(extractThinkingParts(undefined)).toEqual([])
    })

    it("returns empty array when reasoning is empty", () => {
      expect(extractThinkingParts([])).toEqual([])
    })

    it("extracts thinking parts from reasoning", () => {
      const reasoning: ReasoningPart[] = [
        { type: "reasoning", text: "First thought" },
        { type: "reasoning", text: "Second thought" },
      ]

      const result = extractThinkingParts(reasoning)

      expect(result).toEqual([
        { type: "thinkingPart", thinking: "First thought", signature: undefined },
        { type: "thinkingPart", thinking: "Second thought", signature: undefined },
      ])
    })

    it("extracts signature from Anthropic providerMetadata", () => {
      const reasoning: ReasoningPart[] = [
        {
          type: "reasoning",
          text: "Thinking with signature",
          providerMetadata: {
            anthropic: {
              signature: "test-signature-123",
            },
          },
        },
      ]

      const result = extractThinkingParts(reasoning)

      expect(result).toEqual([
        {
          type: "thinkingPart",
          thinking: "Thinking with signature",
          signature: "test-signature-123",
        },
      ])
    })

    it("handles mixed reasoning with and without signatures", () => {
      const reasoning: ReasoningPart[] = [
        { type: "reasoning", text: "No signature" },
        {
          type: "reasoning",
          text: "With signature",
          providerMetadata: { anthropic: { signature: "sig-1" } },
        },
        { type: "reasoning", text: "Also no signature", providerMetadata: {} },
      ]

      const result = extractThinkingParts(reasoning)

      expect(result).toHaveLength(3)
      expect(result[0]?.signature).toBeUndefined()
      expect(result[1]?.signature).toBe("sig-1")
      expect(result[2]?.signature).toBeUndefined()
    })
  })

  describe("extractThinkingText", () => {
    it("returns empty string when reasoning is undefined", () => {
      expect(extractThinkingText(undefined)).toBe("")
    })

    it("returns empty string when reasoning is empty", () => {
      expect(extractThinkingText([])).toBe("")
    })

    it("joins thinking text with newlines", () => {
      const reasoning: ReasoningPart[] = [
        { type: "reasoning", text: "First thought" },
        { type: "reasoning", text: "Second thought" },
        { type: "reasoning", text: "Third thought" },
      ]

      const result = extractThinkingText(reasoning)

      expect(result).toBe("First thought\nSecond thought\nThird thought")
    })

    it("filters out empty text", () => {
      const reasoning: ReasoningPart[] = [
        { type: "reasoning", text: "First thought" },
        { type: "reasoning", text: "" },
        { type: "reasoning", text: "Third thought" },
      ]

      const result = extractThinkingText(reasoning)

      expect(result).toBe("First thought\nThird thought")
    })

    it("handles single reasoning part", () => {
      const reasoning: ReasoningPart[] = [{ type: "reasoning", text: "Single thought" }]

      expect(extractThinkingText(reasoning)).toBe("Single thought")
    })
  })
})
