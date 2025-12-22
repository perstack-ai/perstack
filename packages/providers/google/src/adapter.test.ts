import type { GoogleGenerativeAiProviderConfig } from "@perstack/core"
import { describe, expect, it } from "vitest"
import { GoogleProviderAdapter } from "./adapter.js"

const mockConfig: GoogleGenerativeAiProviderConfig = {
  providerName: "google",
  apiKey: "test-api-key",
}

describe("GoogleProviderAdapter", () => {
  describe("providerName", () => {
    it("returns google", () => {
      const adapter = new GoogleProviderAdapter(mockConfig)
      expect(adapter.providerName).toBe("google")
    })
  })

  describe("createModel", () => {
    it("creates a language model", () => {
      const adapter = new GoogleProviderAdapter(mockConfig)
      const model = adapter.createModel("gemini-2.0-flash")
      expect(model).toBeDefined()
    })
  })

  describe("getProviderTools", () => {
    it("returns empty object for empty tool names", () => {
      const adapter = new GoogleProviderAdapter(mockConfig)
      const tools = adapter.getProviderTools([])
      expect(tools).toEqual({})
    })

    it("returns google_search tool when googleSearch is requested", () => {
      const adapter = new GoogleProviderAdapter(mockConfig)
      const tools = adapter.getProviderTools(["googleSearch"])
      expect(tools["google_search"]).toBeDefined()
    })

    it("returns code_execution tool when codeExecution is requested", () => {
      const adapter = new GoogleProviderAdapter(mockConfig)
      const tools = adapter.getProviderTools(["codeExecution"])
      expect(tools["code_execution"]).toBeDefined()
    })

    it("returns url_context tool when urlContext is requested", () => {
      const adapter = new GoogleProviderAdapter(mockConfig)
      const tools = adapter.getProviderTools(["urlContext"])
      expect(tools["url_context"]).toBeDefined()
    })

    it("skips fileSearch when vectorStoreIds not provided", () => {
      const adapter = new GoogleProviderAdapter(mockConfig)
      const tools = adapter.getProviderTools(["fileSearch"])
      expect(tools["file_search"]).toBeUndefined()
    })

    it("returns file_search tool when fileSearch requested with vectorStoreIds", () => {
      const adapter = new GoogleProviderAdapter(mockConfig)
      const tools = adapter.getProviderTools(["fileSearch"], {
        fileSearch: { vectorStoreIds: ["store_123"] },
      })
      expect(tools["file_search"]).toBeDefined()
    })

    it("returns google_maps tool when googleMaps is requested", () => {
      const adapter = new GoogleProviderAdapter(mockConfig)
      const tools = adapter.getProviderTools(["googleMaps"])
      expect(tools["google_maps"]).toBeDefined()
    })

    it("ignores unknown tool names", () => {
      const adapter = new GoogleProviderAdapter(mockConfig)
      const tools = adapter.getProviderTools(["unknownTool"])
      expect(tools).toEqual({})
    })
  })

  describe("getReasoningOptions", () => {
    it("returns thinking config for string budget levels", () => {
      const adapter = new GoogleProviderAdapter(mockConfig)

      expect(adapter.getReasoningOptions("minimal")).toEqual({
        google: {
          thinkingConfig: { thinkingBudget: 1024, includeThoughts: true },
        },
      })
      expect(adapter.getReasoningOptions("low")).toEqual({
        google: {
          thinkingConfig: { thinkingBudget: 2048, includeThoughts: true },
        },
      })
      expect(adapter.getReasoningOptions("medium")).toEqual({
        google: {
          thinkingConfig: { thinkingBudget: 5000, includeThoughts: true },
        },
      })
      expect(adapter.getReasoningOptions("high")).toEqual({
        google: {
          thinkingConfig: { thinkingBudget: 10000, includeThoughts: true },
        },
      })
    })

    it("returns thinking config for numeric budget", () => {
      const adapter = new GoogleProviderAdapter(mockConfig)
      expect(adapter.getReasoningOptions(3000)).toEqual({
        google: {
          thinkingConfig: { thinkingBudget: 3000, includeThoughts: true },
        },
      })
    })
  })
})
