import type { ProviderAdapter } from "@perstack/provider-core"
import * as aiModule from "ai"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { LLMExecutor } from "./executor.js"
import type { StreamCallbacks } from "./types.js"

vi.mock("ai", async (importOriginal) => {
  const original = await importOriginal<typeof import("ai")>()
  return {
    ...original,
    generateText: vi.fn(),
    streamText: vi.fn(),
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

  describe("streamText", () => {
    const mockStreamText = vi.mocked(aiModule.streamText)

    // Helper to create a mock stream with async iterable fullStream
    type StreamPart =
      | { type: "reasoning-delta"; text: string }
      | { type: "text-delta"; text: string }
      | { type: "tool-call"; toolCallId: string; toolName: string; args: unknown }

    const createMockStream = (
      parts: StreamPart[],
      finalResult: { text: string; toolCalls: unknown[]; reasoning?: unknown[] },
    ) => {
      const stream = {
        fullStream: (async function* () {
          for (const part of parts) {
            yield part
          }
        })(),
        text: Promise.resolve(finalResult.text),
        toolCalls: Promise.resolve(finalResult.toolCalls),
        reasoning: Promise.resolve(finalResult.reasoning ?? []),
        finishReason: Promise.resolve("stop" as const),
        usage: Promise.resolve({ promptTokens: 10, completionTokens: 20 }),
        response: Promise.resolve({ id: "test", modelId: "test" }),
      }
      return stream
    }

    it("calls onReasoningStart when reasoning begins", async () => {
      const mockStream = createMockStream(
        [
          { type: "reasoning-delta", text: "Let me think..." },
          { type: "reasoning-delta", text: " more thoughts" },
        ],
        {
          text: "",
          toolCalls: [],
          reasoning: [{ type: "reasoning", text: "Let me think... more thoughts" }],
        },
      )
      mockStreamText.mockReturnValue(mockStream as never)

      const adapter = createMockAdapter()
      const model = createMockModel()
      const executor = new LLMExecutor(adapter, model)

      const callbacks: StreamCallbacks = {
        onReasoningStart: vi.fn(),
        onReasoningDelta: vi.fn(),
      }

      await executor.streamText({ messages: [], maxRetries: 3, tools: {} }, callbacks)

      expect(callbacks.onReasoningStart).toHaveBeenCalledTimes(1)
    })

    it("calls onReasoningDelta for each reasoning chunk", async () => {
      const mockStream = createMockStream(
        [
          { type: "reasoning-delta", text: "First" },
          { type: "reasoning-delta", text: "Second" },
          { type: "reasoning-delta", text: "Third" },
        ],
        { text: "", toolCalls: [] },
      )
      mockStreamText.mockReturnValue(mockStream as never)

      const adapter = createMockAdapter()
      const model = createMockModel()
      const executor = new LLMExecutor(adapter, model)

      const callbacks: StreamCallbacks = {
        onReasoningStart: vi.fn(),
        onReasoningDelta: vi.fn(),
      }

      await executor.streamText({ messages: [], maxRetries: 3, tools: {} }, callbacks)

      expect(callbacks.onReasoningDelta).toHaveBeenCalledTimes(3)
      expect(callbacks.onReasoningDelta).toHaveBeenNthCalledWith(1, "First")
      expect(callbacks.onReasoningDelta).toHaveBeenNthCalledWith(2, "Second")
      expect(callbacks.onReasoningDelta).toHaveBeenNthCalledWith(3, "Third")
    })

    it("calls onResultStart when text begins", async () => {
      const mockStream = createMockStream(
        [
          { type: "text-delta", text: "Hello" },
          { type: "text-delta", text: " world" },
        ],
        { text: "Hello world", toolCalls: [] },
      )
      mockStreamText.mockReturnValue(mockStream as never)

      const adapter = createMockAdapter()
      const model = createMockModel()
      const executor = new LLMExecutor(adapter, model)

      const callbacks: StreamCallbacks = {
        onResultStart: vi.fn(),
        onResultDelta: vi.fn(),
      }

      await executor.streamText({ messages: [], maxRetries: 3, tools: {} }, callbacks)

      expect(callbacks.onResultStart).toHaveBeenCalledTimes(1)
    })

    it("calls onResultDelta for each text chunk", async () => {
      const mockStream = createMockStream(
        [
          { type: "text-delta", text: "One" },
          { type: "text-delta", text: "Two" },
        ],
        { text: "OneTwo", toolCalls: [] },
      )
      mockStreamText.mockReturnValue(mockStream as never)

      const adapter = createMockAdapter()
      const model = createMockModel()
      const executor = new LLMExecutor(adapter, model)

      const callbacks: StreamCallbacks = {
        onResultStart: vi.fn(),
        onResultDelta: vi.fn(),
      }

      await executor.streamText({ messages: [], maxRetries: 3, tools: {} }, callbacks)

      expect(callbacks.onResultDelta).toHaveBeenCalledTimes(2)
      expect(callbacks.onResultDelta).toHaveBeenNthCalledWith(1, "One")
      expect(callbacks.onResultDelta).toHaveBeenNthCalledWith(2, "Two")
    })

    it("returns final result after stream completes", async () => {
      const mockStream = createMockStream([{ type: "text-delta", text: "Final answer" }], {
        text: "Final answer",
        toolCalls: [],
      })
      mockStreamText.mockReturnValue(mockStream as never)

      const adapter = createMockAdapter()
      const model = createMockModel()
      const executor = new LLMExecutor(adapter, model)

      const result = await executor.streamText({ messages: [], maxRetries: 3, tools: {} }, {})

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.result.text).toBe("Final answer")
      }
    })

    it("handles stream with no reasoning", async () => {
      const mockStream = createMockStream([{ type: "text-delta", text: "Just text" }], {
        text: "Just text",
        toolCalls: [],
      })
      mockStreamText.mockReturnValue(mockStream as never)

      const adapter = createMockAdapter()
      const model = createMockModel()
      const executor = new LLMExecutor(adapter, model)

      const callbacks: StreamCallbacks = {
        onReasoningStart: vi.fn(),
        onReasoningDelta: vi.fn(),
        onResultStart: vi.fn(),
        onResultDelta: vi.fn(),
      }

      await executor.streamText({ messages: [], maxRetries: 3, tools: {} }, callbacks)

      expect(callbacks.onReasoningStart).not.toHaveBeenCalled()
      expect(callbacks.onReasoningDelta).not.toHaveBeenCalled()
      expect(callbacks.onResultStart).toHaveBeenCalledTimes(1)
      expect(callbacks.onResultDelta).toHaveBeenCalledWith("Just text")
    })

    it("handles errors during streaming", async () => {
      const error = new Error("Stream error")
      // Create an async iterable that throws after yielding one item
      const createErrorStream = async function* () {
        yield { type: "text-delta" as const, text: "partial" }
        throw error
      }
      const mockStream = {
        fullStream: createErrorStream(),
        // These won't be accessed because the error happens during iteration
        text: Promise.resolve(""),
        toolCalls: Promise.resolve([]),
        reasoning: Promise.resolve([]),
        finishReason: Promise.resolve("stop" as const),
        usage: Promise.resolve({ promptTokens: 0, completionTokens: 0 }),
        response: Promise.resolve({ id: "test", modelId: "test" }),
      }
      mockStreamText.mockReturnValue(mockStream as never)

      const adapter = createMockAdapter({
        normalizeError: vi.fn().mockReturnValue({ message: "Normalized stream error" }),
        isRetryable: vi.fn().mockReturnValue(true),
      })
      const model = createMockModel()
      const executor = new LLMExecutor(adapter, model)

      const result = await executor.streamText({ messages: [], maxRetries: 3, tools: {} }, {})

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toEqual({ message: "Normalized stream error" })
        expect(result.isRetryable).toBe(true)
      }
    })

    it("handles mixed reasoning and text deltas in correct order", async () => {
      const mockStream = createMockStream(
        [
          { type: "reasoning-delta", text: "Thinking..." },
          { type: "reasoning-delta", text: " done thinking" },
          { type: "text-delta", text: "Result: " },
          { type: "text-delta", text: "42" },
        ],
        { text: "Result: 42", toolCalls: [] },
      )
      mockStreamText.mockReturnValue(mockStream as never)

      const adapter = createMockAdapter()
      const model = createMockModel()
      const executor = new LLMExecutor(adapter, model)

      const callOrder: string[] = []
      const callbacks: StreamCallbacks = {
        onReasoningStart: vi.fn(() => callOrder.push("reasoningStart")),
        onReasoningDelta: vi.fn(() => callOrder.push("reasoningDelta")),
        onResultStart: vi.fn(() => callOrder.push("resultStart")),
        onResultDelta: vi.fn(() => callOrder.push("resultDelta")),
      }

      await executor.streamText({ messages: [], maxRetries: 3, tools: {} }, callbacks)

      expect(callOrder).toEqual([
        "reasoningStart",
        "reasoningDelta",
        "reasoningDelta",
        "resultStart",
        "resultDelta",
        "resultDelta",
      ])
    })

    it("passes reasoning options when reasoningBudget is set", async () => {
      const mockStream = createMockStream([], { text: "", toolCalls: [] })
      mockStreamText.mockReturnValue(mockStream as never)

      const adapter = createMockAdapter({
        getReasoningOptions: vi.fn().mockReturnValue({ anthropic: { thinking: { budget: 5000 } } }),
      })
      const model = createMockModel()
      const executor = new LLMExecutor(adapter, model)

      await executor.streamText(
        { messages: [], maxRetries: 3, tools: {}, reasoningBudget: "medium" },
        {},
      )

      expect(adapter.getReasoningOptions).toHaveBeenCalledWith("medium")
    })
  })
})
