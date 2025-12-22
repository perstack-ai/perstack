import type { OpenAiProviderConfig } from "@perstack/core"
import { describe, expect, it } from "vitest"
import { OpenAIProviderAdapter } from "./adapter.js"

const mockConfig: OpenAiProviderConfig = {
  providerName: "openai",
  apiKey: "test-api-key",
}

describe("OpenAIProviderAdapter", () => {
  describe("providerName", () => {
    it("returns openai", () => {
      const adapter = new OpenAIProviderAdapter(mockConfig)
      expect(adapter.providerName).toBe("openai")
    })
  })

  describe("createModel", () => {
    it("creates a language model", () => {
      const adapter = new OpenAIProviderAdapter(mockConfig)
      const model = adapter.createModel("gpt-4o")
      expect(model).toBeDefined()
    })
  })

  describe("getProviderTools", () => {
    it("returns empty object for empty tool names", () => {
      const adapter = new OpenAIProviderAdapter(mockConfig)
      const tools = adapter.getProviderTools([])
      expect(tools).toEqual({})
    })

    it("returns web_search tool when webSearch is requested", () => {
      const adapter = new OpenAIProviderAdapter(mockConfig)
      const tools = adapter.getProviderTools(["webSearch"])
      expect(tools["web_search"]).toBeDefined()
    })

    it("returns code_interpreter tool when codeInterpreter is requested", () => {
      const adapter = new OpenAIProviderAdapter(mockConfig)
      const tools = adapter.getProviderTools(["codeInterpreter"])
      expect(tools["code_interpreter"]).toBeDefined()
    })

    it("returns image_generation tool when imageGeneration is requested", () => {
      const adapter = new OpenAIProviderAdapter(mockConfig)
      const tools = adapter.getProviderTools(["imageGeneration"])
      expect(tools["image_generation"]).toBeDefined()
    })

    it("skips fileSearch when vectorStoreIds not provided", () => {
      const adapter = new OpenAIProviderAdapter(mockConfig)
      const tools = adapter.getProviderTools(["fileSearch"])
      expect(tools["file_search"]).toBeUndefined()
    })

    it("returns file_search tool when fileSearch requested with vectorStoreIds", () => {
      const adapter = new OpenAIProviderAdapter(mockConfig)
      const tools = adapter.getProviderTools(["fileSearch"], {
        fileSearch: { vectorStoreIds: ["vs_123"] },
      })
      expect(tools["file_search"]).toBeDefined()
    })

    it("ignores unknown tool names", () => {
      const adapter = new OpenAIProviderAdapter(mockConfig)
      const tools = adapter.getProviderTools(["unknownTool"])
      expect(tools).toEqual({})
    })
  })

  describe("getReasoningOptions", () => {
    it("returns reasoning effort for string budget levels", () => {
      const adapter = new OpenAIProviderAdapter(mockConfig)

      expect(adapter.getReasoningOptions("minimal")).toEqual({
        openai: { reasoningEffort: "low" },
      })
      expect(adapter.getReasoningOptions("low")).toEqual({
        openai: { reasoningEffort: "low" },
      })
      expect(adapter.getReasoningOptions("medium")).toEqual({
        openai: { reasoningEffort: "medium" },
      })
      expect(adapter.getReasoningOptions("high")).toEqual({
        openai: { reasoningEffort: "high" },
      })
    })

    it("returns reasoning effort for numeric budget", () => {
      const adapter = new OpenAIProviderAdapter(mockConfig)
      expect(adapter.getReasoningOptions(1000)).toEqual({
        openai: { reasoningEffort: "low" },
      })
      expect(adapter.getReasoningOptions(3000)).toEqual({
        openai: { reasoningEffort: "medium" },
      })
      expect(adapter.getReasoningOptions(8000)).toEqual({
        openai: { reasoningEffort: "high" },
      })
    })
  })
})
