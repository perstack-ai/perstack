import type { Usage } from "@perstack/core"
import { describe, expect, it, vi } from "vitest"
import { calculateContextWindowUsage, getContextWindow, getModel } from "./model.js"

vi.mock("@ai-sdk/anthropic", () => ({
  createAnthropic: vi.fn(() => vi.fn(() => ({ provider: "anthropic" }))),
}))

vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: vi.fn(() => vi.fn(() => ({ provider: "google" }))),
}))

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() => vi.fn(() => ({ provider: "openai" }))),
}))

vi.mock("ollama-ai-provider-v2", () => ({
  createOllama: vi.fn(() => vi.fn(() => ({ provider: "ollama" }))),
}))

vi.mock("@ai-sdk/azure", () => ({
  createAzure: vi.fn(() => vi.fn(() => ({ provider: "azure" }))),
}))

vi.mock("@ai-sdk/amazon-bedrock", () => ({
  createAmazonBedrock: vi.fn(() => vi.fn(() => ({ provider: "bedrock" }))),
}))

vi.mock("@ai-sdk/google-vertex", () => ({
  createVertex: vi.fn(() => vi.fn(() => ({ provider: "vertex" }))),
}))

vi.mock("@ai-sdk/deepseek", () => ({
  createDeepSeek: vi.fn(() => vi.fn(() => ({ provider: "deepseek" }))),
}))

describe("@perstack/runtime: model", () => {
  describe("getModel", () => {
    it("creates anthropic model", () => {
      const model = getModel("claude-sonnet-4-20250514", {
        providerName: "anthropic",
        apiKey: "test-key",
      })
      expect(model).toBeDefined()
    })

    it("creates google model", () => {
      const model = getModel("gemini-2.0-flash", {
        providerName: "google",
        apiKey: "test-key",
      })
      expect(model).toBeDefined()
    })

    it("creates openai model", () => {
      const model = getModel("gpt-4o", {
        providerName: "openai",
        apiKey: "test-key",
      })
      expect(model).toBeDefined()
    })

    it("creates ollama model", () => {
      const model = getModel("llama2", {
        providerName: "ollama",
        baseUrl: "http://localhost:11434",
      })
      expect(model).toBeDefined()
    })

    it("creates azure-openai model", () => {
      const model = getModel("gpt-4", {
        providerName: "azure-openai",
        apiKey: "test-key",
        resourceName: "test-resource",
      })
      expect(model).toBeDefined()
    })

    it("creates amazon-bedrock model", () => {
      const model = getModel("anthropic.claude-v2", {
        providerName: "amazon-bedrock",
        accessKeyId: "test-key",
        secretAccessKey: "test-secret",
        region: "us-east-1",
      })
      expect(model).toBeDefined()
    })

    it("creates google-vertex model", () => {
      const model = getModel("gemini-pro", {
        providerName: "google-vertex",
        project: "test-project",
        location: "us-central1",
      })
      expect(model).toBeDefined()
    })

    it("creates deepseek model", () => {
      const model = getModel("deepseek-chat", {
        providerName: "deepseek",
        apiKey: "test-key",
      })
      expect(model).toBeDefined()
    })
  })

  describe("getContextWindow", () => {
    it("returns context window for known anthropic model", () => {
      const contextWindow = getContextWindow("anthropic", "claude-sonnet-4-20250514")
      expect(contextWindow).toBe(200000)
    })

    it("returns undefined for unknown model", () => {
      const contextWindow = getContextWindow("anthropic", "unknown-model")
      expect(contextWindow).toBeUndefined()
    })

    it("returns undefined for unknown provider", () => {
      const contextWindow = getContextWindow("unknown" as never, "model")
      expect(contextWindow).toBeUndefined()
    })
  })

  describe("calculateContextWindowUsage", () => {
    it("calculates usage correctly", () => {
      const usage: Usage = {
        inputTokens: 1000,
        cachedInputTokens: 500,
        outputTokens: 500,
        reasoningTokens: 0,
        totalTokens: 2000,
      }
      const contextWindow = 10000
      const result = calculateContextWindowUsage(usage, contextWindow)
      expect(result).toBe(0.2)
    })

    it("handles zero tokens", () => {
      const usage: Usage = {
        inputTokens: 0,
        cachedInputTokens: 0,
        outputTokens: 0,
        reasoningTokens: 0,
        totalTokens: 0,
      }
      const contextWindow = 10000
      const result = calculateContextWindowUsage(usage, contextWindow)
      expect(result).toBe(0)
    })

    it("calculates high usage correctly", () => {
      const usage: Usage = {
        inputTokens: 8000,
        cachedInputTokens: 1000,
        outputTokens: 1000,
        reasoningTokens: 0,
        totalTokens: 10000,
      }
      const contextWindow = 10000
      const result = calculateContextWindowUsage(usage, contextWindow)
      expect(result).toBe(1.0)
    })
  })
})
