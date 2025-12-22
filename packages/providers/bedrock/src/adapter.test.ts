import type { AmazonBedrockProviderConfig } from "@perstack/core"
import { describe, expect, it } from "vitest"
import { BedrockProviderAdapter } from "./adapter.js"

const mockConfig: AmazonBedrockProviderConfig = {
  providerName: "amazon-bedrock",
  region: "us-east-1",
  accessKeyId: "test-access-key",
  secretAccessKey: "test-secret-key",
}

describe("BedrockProviderAdapter", () => {
  describe("providerName", () => {
    it("returns amazon-bedrock", () => {
      const adapter = new BedrockProviderAdapter(mockConfig)
      expect(adapter.providerName).toBe("amazon-bedrock")
    })
  })

  describe("createModel", () => {
    it("creates a language model", () => {
      const adapter = new BedrockProviderAdapter(mockConfig)
      const model = adapter.createModel("anthropic.claude-3-sonnet-20240229-v1:0")
      expect(model).toBeDefined()
    })
  })

  describe("getProviderOptions", () => {
    it("returns undefined when no config provided", () => {
      const adapter = new BedrockProviderAdapter(mockConfig)
      expect(adapter.getProviderOptions()).toBeUndefined()
    })

    it("returns undefined when no guardrails or cachePoint", () => {
      const adapter = new BedrockProviderAdapter(mockConfig)
      expect(adapter.getProviderOptions({})).toBeUndefined()
    })

    it("returns guardrails config when provided", () => {
      const adapter = new BedrockProviderAdapter(mockConfig)
      const result = adapter.getProviderOptions({
        guardrails: {
          guardrailIdentifier: "my-guardrail",
          guardrailVersion: "1",
          trace: "enabled",
        },
      })
      expect(result).toEqual({
        bedrock: {
          guardrailConfig: {
            guardrailIdentifier: "my-guardrail",
            guardrailVersion: "1",
            trace: "enabled",
          },
        },
      })
    })

    it("returns cachePoint config when provided", () => {
      const adapter = new BedrockProviderAdapter(mockConfig)
      const result = adapter.getProviderOptions({
        cachePoint: { type: "default" },
      })
      expect(result).toEqual({
        bedrock: {
          cachePoint: { type: "default" },
        },
      })
    })
  })

  describe("getReasoningOptions", () => {
    it("returns reasoning config for string budget levels", () => {
      const adapter = new BedrockProviderAdapter(mockConfig)

      expect(adapter.getReasoningOptions("minimal")).toEqual({
        bedrock: { reasoning: { budgetTokens: 1024 } },
      })
      expect(adapter.getReasoningOptions("low")).toEqual({
        bedrock: { reasoning: { budgetTokens: 2048 } },
      })
      expect(adapter.getReasoningOptions("medium")).toEqual({
        bedrock: { reasoning: { budgetTokens: 5000 } },
      })
      expect(adapter.getReasoningOptions("high")).toEqual({
        bedrock: { reasoning: { budgetTokens: 10000 } },
      })
    })

    it("returns reasoning config for numeric budget", () => {
      const adapter = new BedrockProviderAdapter(mockConfig)
      expect(adapter.getReasoningOptions(3000)).toEqual({
        bedrock: { reasoning: { budgetTokens: 3000 } },
      })
    })
  })
})
