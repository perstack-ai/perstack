import { createId } from "@paralleldrive/cuid2"
import type { GenerateTextResult, ToolSet } from "ai"
import { beforeEach, describe, expect, it } from "vitest"
import { createCheckpoint, createRunSetting, createStep } from "../../../test/run-params.js"
import type { LLMExecutor } from "../../llm/index.js"
import { createMockLLMExecutor, type MockLLMExecutor } from "../../llm/index.js"
import type { LLMExecutionResult } from "../../llm/types.js"
import { StateMachineLogics } from "../index.js"

let mockLLMExecutor: MockLLMExecutor

function createMockResult(text?: string): LLMExecutionResult {
  return {
    success: true,
    result: {
      text,
      finishReason: "stop",
      toolCalls: [],
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      response: { id: "mock", timestamp: new Date(), modelId: "mock", headers: {} },
      request: {},
      toolResults: [],
      warnings: [],
      sources: [],
      providerMetadata: undefined,
      reasoning: undefined,
      reasoningDetails: [],
      files: [],
      logprobs: undefined,
      toJsonResponse: () => new Response(),
      experimental_output: undefined,
      steps: [],
      rawCall: {},
    } as unknown as GenerateTextResult<ToolSet, never>,
  }
}

function createMockErrorResult(
  error: { name: string; message: string; statusCode?: number },
  isRetryable: boolean,
): LLMExecutionResult {
  return {
    success: false,
    error: {
      name: error.name,
      message: error.message,
      statusCode: error.statusCode,
      isRetryable,
      provider: "anthropic",
    },
    isRetryable,
  }
}

describe("@perstack/runtime: StateMachineLogic['GeneratingRunResult']", () => {
  beforeEach(() => {
    mockLLMExecutor = createMockLLMExecutor()
  })

  it("generates run result via LLM and completes", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep({
      toolCalls: [
        {
          id: "tc_123",
          skillName: "@perstack/base",
          toolName: "attemptCompletion",
          args: {},
        },
      ],
      toolResults: [
        {
          id: "tc_123",
          skillName: "@perstack/base",
          toolName: "attemptCompletion",
          result: [{ type: "textPart", text: JSON.stringify({}), id: createId() }],
        },
      ],
    })
    mockLLMExecutor.setMockResult(createMockResult("Task completed successfully"))
    const event = await StateMachineLogics.GeneratingRunResult({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: {},
      llmExecutor: mockLLMExecutor as unknown as LLMExecutor,
    })
    expect(event.type).toBe("completeRun")
    if (event.type === "completeRun") {
      expect(event.text).toBe("Task completed successfully")
    }
  })

  it("returns retry event on generation error", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep({
      toolCalls: [
        {
          id: "tc_123",
          skillName: "@perstack/base",
          toolName: "attemptCompletion",
          args: {},
        },
      ],
      toolResults: [
        {
          id: "tc_123",
          skillName: "@perstack/base",
          toolName: "attemptCompletion",
          result: [{ type: "textPart", text: JSON.stringify({}), id: createId() }],
        },
      ],
    })
    mockLLMExecutor.setMockResult(
      createMockErrorResult({ name: "Error", message: "Generation failed" }, true),
    )
    const event = await StateMachineLogics.GeneratingRunResult({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: {},
      llmExecutor: mockLLMExecutor as unknown as LLMExecutor,
    })
    expect(event.type).toBe("retry")
  })

  it("returns stopRunByError event on non-retryable API error (401)", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep({
      toolCalls: [
        {
          id: "tc_123",
          skillName: "@perstack/base",
          toolName: "attemptCompletion",
          args: {},
        },
      ],
      toolResults: [
        {
          id: "tc_123",
          skillName: "@perstack/base",
          toolName: "attemptCompletion",
          result: [{ type: "textPart", text: JSON.stringify({}), id: createId() }],
        },
      ],
    })
    mockLLMExecutor.setMockResult(
      createMockErrorResult(
        { name: "APICallError", message: "Unauthorized", statusCode: 401 },
        false,
      ),
    )
    const event = await StateMachineLogics.GeneratingRunResult({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: {},
      llmExecutor: mockLLMExecutor as unknown as LLMExecutor,
    })
    expect(event.type).toBe("stopRunByError")
    if (event.type === "stopRunByError") {
      expect(event.error.statusCode).toBe(401)
      expect(event.error.isRetryable).toBe(false)
      expect(event.checkpoint.status).toBe("stoppedByError")
    }
  })

  it("returns retry event on retryable API error (429)", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep({
      toolCalls: [
        {
          id: "tc_123",
          skillName: "@perstack/base",
          toolName: "attemptCompletion",
          args: {},
        },
      ],
      toolResults: [
        {
          id: "tc_123",
          skillName: "@perstack/base",
          toolName: "attemptCompletion",
          result: [{ type: "textPart", text: JSON.stringify({}), id: createId() }],
        },
      ],
    })
    mockLLMExecutor.setMockResult(
      createMockErrorResult(
        { name: "APICallError", message: "Rate limited", statusCode: 429 },
        true,
      ),
    )
    const event = await StateMachineLogics.GeneratingRunResult({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: {},
      llmExecutor: mockLLMExecutor as unknown as LLMExecutor,
    })
    expect(event.type).toBe("retry")
  })

  it("throws error when tool calls or results missing", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep({ toolCalls: undefined, toolResults: undefined })
    await expect(
      StateMachineLogics.GeneratingRunResult({
        setting,
        checkpoint,
        step,
        eventListener: async () => {},
        skillManagers: {},
        llmExecutor: mockLLMExecutor as unknown as LLMExecutor,
      }),
    ).rejects.toThrow("No tool calls or tool results found")
  })

  it("includes proper event metadata", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep({
      toolCalls: [
        {
          id: "tc_123",
          skillName: "@perstack/base",
          toolName: "attemptCompletion",
          args: {},
        },
      ],
      toolResults: [
        {
          id: "tc_123",
          skillName: "@perstack/base",
          toolName: "attemptCompletion",
          result: [{ type: "textPart", text: JSON.stringify({}), id: createId() }],
        },
      ],
    })
    mockLLMExecutor.setMockResult(createMockResult("Final result"))
    const event = await StateMachineLogics.GeneratingRunResult({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: {},
      llmExecutor: mockLLMExecutor as unknown as LLMExecutor,
    })
    expect(event.id).toBeDefined()
    expect(typeof event.id).toBe("string")
  })

  it("returns stopRunByError when retryable error occurs but retryCount >= maxRetries", async () => {
    const setting = createRunSetting({ maxRetries: 3 })
    const checkpoint = createCheckpoint({ retryCount: 3 })
    const step = createStep({
      toolCalls: [
        {
          id: "tc_retry",
          skillName: "@perstack/base",
          toolName: "attemptCompletion",
          args: {},
        },
      ],
      toolResults: [
        {
          id: "tc_retry",
          skillName: "@perstack/base",
          toolName: "attemptCompletion",
          result: [{ type: "textPart", text: JSON.stringify({}), id: createId() }],
        },
      ],
    })
    mockLLMExecutor.setMockResult(
      createMockErrorResult({ name: "RateLimitError", message: "Rate limited" }, true),
    )
    const event = await StateMachineLogics.GeneratingRunResult({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: {},
      llmExecutor: mockLLMExecutor as unknown as LLMExecutor,
    })
    expect(event.type).toBe("stopRunByError")
    if (event.type === "stopRunByError") {
      expect(event.error.message).toContain("Max retries (3) exceeded")
    }
  })

  it("handles undefined text from LLM by using empty string", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep({
      toolCalls: [
        {
          id: "tc_123",
          skillName: "@perstack/base",
          toolName: "attemptCompletion",
          args: {},
        },
      ],
      toolResults: [
        {
          id: "tc_123",
          skillName: "@perstack/base",
          toolName: "attemptCompletion",
          result: [{ type: "textPart", text: JSON.stringify({}), id: createId() }],
        },
      ],
    })
    mockLLMExecutor.setMockResult(createMockResult(undefined))
    const event = await StateMachineLogics.GeneratingRunResult({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: {},
      llmExecutor: mockLLMExecutor as unknown as LLMExecutor,
    })
    expect(event.type).toBe("completeRun")
    if (event.type === "completeRun") {
      expect(event.text).toBeUndefined()
      const lastMessage = event.checkpoint.messages[event.checkpoint.messages.length - 1]
      expect(lastMessage.type).toBe("expertMessage")
      if (lastMessage.type === "expertMessage") {
        const textPart = lastMessage.contents.find((c) => c.type === "textPart")
        expect(textPart).toBeDefined()
        if (textPart?.type === "textPart") {
          expect(textPart.text).toBe("")
        }
      }
    }
  })
})
