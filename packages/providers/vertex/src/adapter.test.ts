import type { GoogleVertexProviderConfig } from "@perstack/core"
import { describe, expect, it } from "vitest"
import { VertexProviderAdapter } from "./adapter.js"

const mockConfig: GoogleVertexProviderConfig = {
  providerName: "google-vertex",
  project: "test-project",
  location: "us-central1",
}

describe("VertexProviderAdapter", () => {
  describe("providerName", () => {
    it("returns google-vertex", () => {
      const adapter = new VertexProviderAdapter(mockConfig)
      expect(adapter.providerName).toBe("google-vertex")
    })
  })

  describe("createModel", () => {
    it("creates a language model", () => {
      const adapter = new VertexProviderAdapter(mockConfig)
      const model = adapter.createModel("gemini-2.0-flash")
      expect(model).toBeDefined()
    })
  })

  describe("getProviderTools", () => {
    it("returns empty object for empty tool names", () => {
      const adapter = new VertexProviderAdapter(mockConfig)
      const tools = adapter.getProviderTools([])
      expect(tools).toEqual({})
    })

    it("returns google_search tool when googleSearch is requested", () => {
      const adapter = new VertexProviderAdapter(mockConfig)
      const tools = adapter.getProviderTools(["googleSearch"])
      expect(tools["google_search"]).toBeDefined()
    })

    it("returns code_execution tool when codeExecution is requested", () => {
      const adapter = new VertexProviderAdapter(mockConfig)
      const tools = adapter.getProviderTools(["codeExecution"])
      expect(tools["code_execution"]).toBeDefined()
    })

    it("returns url_context tool when urlContext is requested", () => {
      const adapter = new VertexProviderAdapter(mockConfig)
      const tools = adapter.getProviderTools(["urlContext"])
      expect(tools["url_context"]).toBeDefined()
    })

    it("returns enterprise_web_search tool when enterpriseWebSearch is requested", () => {
      const adapter = new VertexProviderAdapter(mockConfig)
      const tools = adapter.getProviderTools(["enterpriseWebSearch"])
      expect(tools["enterprise_web_search"]).toBeDefined()
    })

    it("returns google_maps tool when googleMaps is requested", () => {
      const adapter = new VertexProviderAdapter(mockConfig)
      const tools = adapter.getProviderTools(["googleMaps"])
      expect(tools["google_maps"]).toBeDefined()
    })

    it("ignores unknown tool names", () => {
      const adapter = new VertexProviderAdapter(mockConfig)
      const tools = adapter.getProviderTools(["unknownTool"])
      expect(tools).toEqual({})
    })
  })

  describe("getProviderOptions", () => {
    it("returns undefined when no config provided", () => {
      const adapter = new VertexProviderAdapter(mockConfig)
      expect(adapter.getProviderOptions()).toBeUndefined()
    })

    it("returns undefined when safetySettings is empty", () => {
      const adapter = new VertexProviderAdapter(mockConfig)
      expect(adapter.getProviderOptions({ safetySettings: [] })).toBeUndefined()
    })

    it("returns safetySettings when provided", () => {
      const adapter = new VertexProviderAdapter(mockConfig)
      const result = adapter.getProviderOptions({
        safetySettings: [
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
        ],
      })
      expect(result).toEqual({
        vertex: {
          safetySettings: [
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
          ],
        },
      })
    })
  })

  describe("getReasoningOptions", () => {
    it("returns thinking config for string budget levels", () => {
      const adapter = new VertexProviderAdapter(mockConfig)

      expect(adapter.getReasoningOptions("minimal")).toEqual({
        vertex: {
          thinkingConfig: { thinkingBudget: 1024, includeThoughts: true },
        },
      })
      expect(adapter.getReasoningOptions("low")).toEqual({
        vertex: {
          thinkingConfig: { thinkingBudget: 2048, includeThoughts: true },
        },
      })
      expect(adapter.getReasoningOptions("medium")).toEqual({
        vertex: {
          thinkingConfig: { thinkingBudget: 5000, includeThoughts: true },
        },
      })
      expect(adapter.getReasoningOptions("high")).toEqual({
        vertex: {
          thinkingConfig: { thinkingBudget: 10000, includeThoughts: true },
        },
      })
    })

    it("returns thinking config for numeric budget", () => {
      const adapter = new VertexProviderAdapter(mockConfig)
      expect(adapter.getReasoningOptions(3000)).toEqual({
        vertex: {
          thinkingConfig: { thinkingBudget: 3000, includeThoughts: true },
        },
      })
    })
  })
})
