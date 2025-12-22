import type { OllamaProviderConfig } from "@perstack/core"
import { describe, expect, it } from "vitest"
import { OllamaProviderAdapter } from "./adapter.js"

const mockConfig: OllamaProviderConfig = {
  providerName: "ollama",
}

describe("OllamaProviderAdapter", () => {
  describe("providerName", () => {
    it("returns ollama", () => {
      const adapter = new OllamaProviderAdapter(mockConfig)
      expect(adapter.providerName).toBe("ollama")
    })
  })

  describe("createModel", () => {
    it("creates a language model", () => {
      const adapter = new OllamaProviderAdapter(mockConfig)
      const model = adapter.createModel("llama3")
      expect(model).toBeDefined()
    })
  })

  describe("getProviderTools", () => {
    it("returns empty object for any tool names (no tools supported)", () => {
      const adapter = new OllamaProviderAdapter(mockConfig)
      const tools = adapter.getProviderTools(["webSearch"])
      expect(tools).toEqual({})
    })
  })

  describe("getProviderOptions", () => {
    it("returns undefined when no config provided", () => {
      const adapter = new OllamaProviderAdapter(mockConfig)
      expect(adapter.getProviderOptions()).toBeUndefined()
    })

    it("returns undefined when think is not set", () => {
      const adapter = new OllamaProviderAdapter(mockConfig)
      expect(adapter.getProviderOptions({})).toBeUndefined()
    })

    it("returns think option when set to true", () => {
      const adapter = new OllamaProviderAdapter(mockConfig)
      expect(adapter.getProviderOptions({ think: true })).toEqual({
        ollama: { think: true },
      })
    })

    it("returns think option when set to false", () => {
      const adapter = new OllamaProviderAdapter(mockConfig)
      expect(adapter.getProviderOptions({ think: false })).toEqual({
        ollama: { think: false },
      })
    })
  })

  describe("getReasoningOptions", () => {
    it("returns think toggle for any budget level", () => {
      const adapter = new OllamaProviderAdapter(mockConfig)

      expect(adapter.getReasoningOptions("minimal")).toEqual({
        ollama: { think: true },
      })
      expect(adapter.getReasoningOptions("low")).toEqual({
        ollama: { think: true },
      })
      expect(adapter.getReasoningOptions("medium")).toEqual({
        ollama: { think: true },
      })
      expect(adapter.getReasoningOptions("high")).toEqual({
        ollama: { think: true },
      })
    })

    it("returns think toggle for numeric budget", () => {
      const adapter = new OllamaProviderAdapter(mockConfig)
      expect(adapter.getReasoningOptions(3000)).toEqual({
        ollama: { think: true },
      })
    })

    it("returns undefined for none budget", () => {
      const adapter = new OllamaProviderAdapter(mockConfig)
      expect(adapter.getReasoningOptions("none")).toBeUndefined()
    })

    it("returns undefined for zero budget", () => {
      const adapter = new OllamaProviderAdapter(mockConfig)
      expect(adapter.getReasoningOptions(0)).toBeUndefined()
    })
  })
})
