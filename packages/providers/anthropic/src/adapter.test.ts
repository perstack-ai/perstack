import type { AnthropicProviderConfig } from "@perstack/core"
import { describe, expect, it } from "vitest"
import { AnthropicProviderAdapter } from "./adapter.js"

const mockConfig: AnthropicProviderConfig = {
  providerName: "anthropic",
  apiKey: "test-api-key",
}

describe("AnthropicProviderAdapter", () => {
  describe("providerName", () => {
    it("returns anthropic", () => {
      const adapter = new AnthropicProviderAdapter(mockConfig)
      expect(adapter.providerName).toBe("anthropic")
    })
  })

  describe("createModel", () => {
    it("creates a language model", () => {
      const adapter = new AnthropicProviderAdapter(mockConfig)
      const model = adapter.createModel("claude-sonnet-4-20250514")
      expect(model).toBeDefined()
    })
  })

  describe("getProviderTools", () => {
    it("returns empty object for empty tool names", () => {
      const adapter = new AnthropicProviderAdapter(mockConfig)
      const tools = adapter.getProviderTools([])
      expect(tools).toEqual({})
    })

    it("returns web_search tool when webSearch is requested", () => {
      const adapter = new AnthropicProviderAdapter(mockConfig)
      const tools = adapter.getProviderTools(["webSearch"])
      expect(tools["web_search"]).toBeDefined()
    })

    it("returns web_fetch tool when webFetch is requested", () => {
      const adapter = new AnthropicProviderAdapter(mockConfig)
      const tools = adapter.getProviderTools(["webFetch"])
      expect(tools["web_fetch"]).toBeDefined()
    })

    it("returns code_execution tool when codeExecution is requested", () => {
      const adapter = new AnthropicProviderAdapter(mockConfig)
      const tools = adapter.getProviderTools(["codeExecution"])
      expect(tools["code_execution"]).toBeDefined()
    })

    it("returns multiple tools when multiple are requested", () => {
      const adapter = new AnthropicProviderAdapter(mockConfig)
      const tools = adapter.getProviderTools(["webSearch", "webFetch", "codeExecution"])
      expect(tools["web_search"]).toBeDefined()
      expect(tools["web_fetch"]).toBeDefined()
      expect(tools["code_execution"]).toBeDefined()
    })

    it("ignores unknown tool names", () => {
      const adapter = new AnthropicProviderAdapter(mockConfig)
      const tools = adapter.getProviderTools(["unknownTool"])
      expect(tools).toEqual({})
    })
  })

  describe("getProviderOptions", () => {
    it("returns undefined when no skills provided", () => {
      const adapter = new AnthropicProviderAdapter(mockConfig)
      const options = adapter.getProviderOptions()
      expect(options).toBeUndefined()
    })

    it("returns undefined when empty skills array provided", () => {
      const adapter = new AnthropicProviderAdapter(mockConfig)
      const options = adapter.getProviderOptions({ skills: [] })
      expect(options).toBeUndefined()
    })

    it("returns provider options with builtin skills", () => {
      const adapter = new AnthropicProviderAdapter(mockConfig)
      const options = adapter.getProviderOptions({
        skills: [{ type: "builtin", skillId: "pdf" }],
      })
      expect(options).toEqual({
        anthropic: {
          container: {
            skills: [{ type: "builtin", name: "pdf" }],
          },
        },
      })
    })
  })
})
