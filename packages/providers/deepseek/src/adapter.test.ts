import type { DeepseekProviderConfig } from "@perstack/core"
import { describe, expect, it } from "vitest"
import { DeepseekProviderAdapter } from "./adapter.js"

const mockConfig: DeepseekProviderConfig = {
  providerName: "deepseek",
  apiKey: "test-api-key",
}

describe("DeepseekProviderAdapter", () => {
  describe("providerName", () => {
    it("returns deepseek", () => {
      const adapter = new DeepseekProviderAdapter(mockConfig)
      expect(adapter.providerName).toBe("deepseek")
    })
  })

  describe("createModel", () => {
    it("creates a language model", () => {
      const adapter = new DeepseekProviderAdapter(mockConfig)
      const model = adapter.createModel("deepseek-chat")
      expect(model).toBeDefined()
    })
  })

  describe("getProviderTools", () => {
    it("returns empty object for any tool names (no tools supported)", () => {
      const adapter = new DeepseekProviderAdapter(mockConfig)
      const tools = adapter.getProviderTools(["webSearch"])
      expect(tools).toEqual({})
    })
  })
})
