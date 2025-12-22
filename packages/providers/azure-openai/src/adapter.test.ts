import type { AzureOpenAiProviderConfig } from "@perstack/core"
import { describe, expect, it } from "vitest"
import { AzureOpenAIProviderAdapter } from "./adapter.js"

const mockConfig: AzureOpenAiProviderConfig = {
  providerName: "azure-openai",
  apiKey: "test-api-key",
  resourceName: "test-resource",
}

describe("AzureOpenAIProviderAdapter", () => {
  describe("providerName", () => {
    it("returns azure-openai", () => {
      const adapter = new AzureOpenAIProviderAdapter(mockConfig)
      expect(adapter.providerName).toBe("azure-openai")
    })
  })

  describe("createModel", () => {
    it("creates a language model", () => {
      const adapter = new AzureOpenAIProviderAdapter(mockConfig)
      const model = adapter.createModel("gpt-4o")
      expect(model).toBeDefined()
    })
  })

  describe("getProviderTools", () => {
    it("returns empty object for empty tool names", () => {
      const adapter = new AzureOpenAIProviderAdapter(mockConfig)
      const tools = adapter.getProviderTools([])
      expect(tools).toEqual({})
    })

    it("returns web_search_preview tool when webSearchPreview is requested", () => {
      const adapter = new AzureOpenAIProviderAdapter(mockConfig)
      const tools = adapter.getProviderTools(["webSearchPreview"])
      expect(tools["web_search_preview"]).toBeDefined()
    })

    it("returns code_interpreter tool when codeInterpreter is requested", () => {
      const adapter = new AzureOpenAIProviderAdapter(mockConfig)
      const tools = adapter.getProviderTools(["codeInterpreter"])
      expect(tools["code_interpreter"]).toBeDefined()
    })

    it("returns image_generation tool when imageGeneration is requested", () => {
      const adapter = new AzureOpenAIProviderAdapter(mockConfig)
      const tools = adapter.getProviderTools(["imageGeneration"])
      expect(tools["image_generation"]).toBeDefined()
    })

    it("skips fileSearch when vectorStoreIds not provided", () => {
      const adapter = new AzureOpenAIProviderAdapter(mockConfig)
      const tools = adapter.getProviderTools(["fileSearch"])
      expect(tools["file_search"]).toBeUndefined()
    })

    it("returns file_search tool when fileSearch requested with vectorStoreIds", () => {
      const adapter = new AzureOpenAIProviderAdapter(mockConfig)
      const tools = adapter.getProviderTools(["fileSearch"], {
        fileSearch: { vectorStoreIds: ["vs_123"] },
      })
      expect(tools["file_search"]).toBeDefined()
    })

    it("ignores unknown tool names", () => {
      const adapter = new AzureOpenAIProviderAdapter(mockConfig)
      const tools = adapter.getProviderTools(["unknownTool"])
      expect(tools).toEqual({})
    })
  })
})
