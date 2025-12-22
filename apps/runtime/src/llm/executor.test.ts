import type { ProviderAdapter } from "@perstack/provider-core"
import * as aiModule from "ai"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { LLMExecutor } from "./executor.js"

vi.mock("ai", async (importOriginal) => {
  const original = await importOriginal<typeof import("ai")>()
  return {
    ...original,
    generateText: vi.fn(),
  }
})

describe("LLMExecutor", () => {
  const createMockAdapter = (overrides: Partial<ProviderAdapter> = {}): ProviderAdapter => ({
    providerName: "anthropic",
    createModel: vi.fn(),
    getProviderTools: vi.fn().mockReturnValue({}),
    getProviderOptions: vi.fn().mockReturnValue(undefined),
    getReasoningOptions: vi.fn().mockReturnValue({ anthropic: { thinking: true } }),
    normalizeError: vi.fn().mockImplementation((e) => e),
    isRetryable: vi.fn().mockReturnValue(false),
    ...overrides,
  })

  const createMockModel = () =>
    ({
      generate: vi.fn(),
    }) as never

  const mockGenerateText = vi.mocked(aiModule.generateText)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("generateText", () => {
    it("returns success result on successful generation", async () => {
      const mockResult = { finishReason: "stop", text: "response" }
      mockGenerateText.mockResolvedValue(mockResult as never)

      const adapter = createMockAdapter()
      const model = createMockModel()
      const executor = new LLMExecutor(adapter, model)

      const result = await executor.generateText({
        messages: [],
        maxRetries: 3,
        tools: {},
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.result).toBe(mockResult)
      }
    })

    it("passes reasoning options when reasoningBudget is set", async () => {
      mockGenerateText.mockResolvedValue({ finishReason: "stop" } as never)

      const adapter = createMockAdapter({
        getReasoningOptions: vi.fn().mockReturnValue({ anthropic: { thinking: { budget: 5000 } } }),
      })
      const model = createMockModel()
      const executor = new LLMExecutor(adapter, model)

      await executor.generateText({
        messages: [],
        maxRetries: 3,
        tools: {},
        reasoningBudget: "low",
      })

      expect(adapter.getReasoningOptions).toHaveBeenCalledWith("low")
    })

    it("does not pass reasoning options when reasoningBudget is 0", async () => {
      mockGenerateText.mockResolvedValue({ finishReason: "stop" } as never)

      const adapter = createMockAdapter()
      const model = createMockModel()
      const executor = new LLMExecutor(adapter, model)

      await executor.generateText({
        messages: [],
        maxRetries: 3,
        tools: {},
        reasoningBudget: 0,
      })

      expect(adapter.getReasoningOptions).not.toHaveBeenCalled()
    })

    it("does not pass reasoning options when reasoningBudget is 'none'", async () => {
      mockGenerateText.mockResolvedValue({ finishReason: "stop" } as never)

      const adapter = createMockAdapter()
      const model = createMockModel()
      const executor = new LLMExecutor(adapter, model)

      await executor.generateText({
        messages: [],
        maxRetries: 3,
        tools: {},
        reasoningBudget: "none",
      })

      expect(adapter.getReasoningOptions).not.toHaveBeenCalled()
    })

    it("returns failure result on error", async () => {
      const error = new Error("API error")
      mockGenerateText.mockRejectedValue(error)

      const adapter = createMockAdapter({
        normalizeError: vi.fn().mockReturnValue({ message: "Normalized error" }),
        isRetryable: vi.fn().mockReturnValue(true),
      })
      const model = createMockModel()
      const executor = new LLMExecutor(adapter, model)

      const result = await executor.generateText({
        messages: [],
        maxRetries: 3,
        tools: {},
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toEqual({ message: "Normalized error" })
        expect(result.isRetryable).toBe(true)
      }
    })
  })

  describe("generateTextWithoutTools", () => {
    it("returns success result on successful generation", async () => {
      const mockResult = { finishReason: "stop", text: "response" }
      mockGenerateText.mockResolvedValue(mockResult as never)

      const adapter = createMockAdapter()
      const model = createMockModel()
      const executor = new LLMExecutor(adapter, model)

      const result = await executor.generateTextWithoutTools({
        messages: [],
        maxRetries: 3,
      })

      expect(result.success).toBe(true)
    })

    it("passes reasoning options when reasoningBudget is set", async () => {
      mockGenerateText.mockResolvedValue({ finishReason: "stop" } as never)

      const adapter = createMockAdapter({
        getReasoningOptions: vi.fn().mockReturnValue({ anthropic: { thinking: { budget: 5000 } } }),
      })
      const model = createMockModel()
      const executor = new LLMExecutor(adapter, model)

      await executor.generateTextWithoutTools({
        messages: [],
        maxRetries: 3,
        reasoningBudget: "medium",
      })

      expect(adapter.getReasoningOptions).toHaveBeenCalledWith("medium")
    })

    it("does not pass reasoning options when reasoningBudget is undefined", async () => {
      mockGenerateText.mockResolvedValue({ finishReason: "stop" } as never)

      const adapter = createMockAdapter()
      const model = createMockModel()
      const executor = new LLMExecutor(adapter, model)

      await executor.generateTextWithoutTools({
        messages: [],
        maxRetries: 3,
      })

      expect(adapter.getReasoningOptions).not.toHaveBeenCalled()
    })

    it("returns failure result on error", async () => {
      const error = new Error("API error")
      mockGenerateText.mockRejectedValue(error)

      const adapter = createMockAdapter({
        normalizeError: vi.fn().mockReturnValue({ message: "Error" }),
        isRetryable: vi.fn().mockReturnValue(false),
      })
      const model = createMockModel()
      const executor = new LLMExecutor(adapter, model)

      const result = await executor.generateTextWithoutTools({
        messages: [],
        maxRetries: 3,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.isRetryable).toBe(false)
      }
    })
  })

  describe("mergeProviderOptions", () => {
    it("merges multiple provider options", async () => {
      mockGenerateText.mockResolvedValue({ finishReason: "stop" } as never)

      const adapter = createMockAdapter({
        getProviderOptions: vi.fn().mockReturnValue({ anthropic: { cacheControl: true } }),
        getReasoningOptions: vi.fn().mockReturnValue({ anthropic: { thinking: { budget: 5000 } } }),
      })
      const model = createMockModel()
      const executor = new LLMExecutor(adapter, model)

      await executor.generateText({
        messages: [],
        maxRetries: 3,
        tools: {},
        reasoningBudget: "low",
      })

      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          providerOptions: expect.objectContaining({
            anthropic: expect.objectContaining({
              cacheControl: true,
              thinking: { budget: 5000 },
            }),
          }),
        }),
      )
    })

    it("returns undefined when no options are defined", async () => {
      mockGenerateText.mockResolvedValue({ finishReason: "stop" } as never)

      const adapter = createMockAdapter({
        getProviderOptions: vi.fn().mockReturnValue(undefined),
      })
      const model = createMockModel()
      const executor = new LLMExecutor(adapter, model)

      await executor.generateText({
        messages: [],
        maxRetries: 3,
        tools: {},
        reasoningBudget: 0, // disabled
      })

      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          providerOptions: undefined,
        }),
      )
    })
  })
})
