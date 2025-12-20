import type { ProviderAdapter } from "@perstack/provider-core"
import { MockLanguageModelV2 } from "ai/test"
import { describe, expect, it, vi } from "vitest"
import { LLMExecutor } from "./executor.js"

function createMockAdapter(): ProviderAdapter {
  return {
    providerName: "anthropic",
    createModel: vi.fn(),
    getProviderTools: vi.fn().mockReturnValue({}),
    getProviderOptions: vi.fn().mockReturnValue(undefined),
    normalizeError: vi.fn().mockImplementation((error: unknown) => ({
      code: "unknown",
      message: error instanceof Error ? error.message : String(error),
      retryable: false,
      originalError: error,
    })),
    isRetryable: vi.fn().mockReturnValue(false),
  }
}

function createMockModel(response: string) {
  return new MockLanguageModelV2({
    doGenerate: async () => ({
      content: [{ type: "text" as const, text: response }],
      warnings: [],
      finishReason: "stop" as const,
      usage: { inputTokens: 10, outputTokens: 5 },
      response: { id: "test-id", modelId: "test-model", timestamp: new Date() },
    }),
  })
}

describe("LLMExecutor", () => {
  describe("generateText", () => {
    it("returns success result on successful generation", async () => {
      const adapter = createMockAdapter()
      const model = createMockModel("Hello, world!")
      const executor = new LLMExecutor(adapter, model)

      const result = await executor.generateText({
        messages: [{ role: "user", content: "Hi" }],
        tools: {},
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.result.text).toBe("Hello, world!")
      }
    })

    it("returns failure result on error", async () => {
      const adapter = createMockAdapter()
      const model = new MockLanguageModelV2({
        doGenerate: async () => {
          throw new Error("API Error")
        },
      })
      const executor = new LLMExecutor(adapter, model)

      const result = await executor.generateText({
        messages: [{ role: "user", content: "Hi" }],
        tools: {},
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toBe("API Error")
      }
    })
  })

  describe("generateTextWithoutTools", () => {
    it("returns success result on successful generation", async () => {
      const adapter = createMockAdapter()
      const model = createMockModel("Response without tools")
      const executor = new LLMExecutor(adapter, model)

      const result = await executor.generateTextWithoutTools({
        messages: [{ role: "user", content: "Hi" }],
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.result.text).toBe("Response without tools")
      }
    })
  })
})
