import type { GenerateTextResult, ToolSet } from "ai"
import { beforeEach, describe, expect, it } from "vitest"
import { createCheckpoint, createRunSetting, createStep } from "../../../test/run-params.js"
import type { LLMExecutor } from "../../llm/index.js"
import { createMockLLMExecutor, type MockLLMExecutor } from "../../llm/index.js"
import type { LLMExecutionResult } from "../../llm/types.js"
import type { BaseSkillManager } from "../../skill-manager/index.js"
import { StateMachineLogics } from "../index.js"

let mockLLMExecutor: MockLLMExecutor

type MockToolCall = {
  toolCallId: string
  toolName: string
  args: Record<string, unknown>
}

function createMockResult(
  options: {
    finishReason?: "stop" | "tool-calls" | "length" | "error"
    text?: string
    toolCalls?: MockToolCall[]
    reasoning?: Array<{ type: "reasoning"; text: string }>
  } = {},
): LLMExecutionResult {
  const { finishReason = "stop", text = "Generated text", toolCalls = [], reasoning } = options
  return {
    success: true,
    result: {
      text,
      finishReason,
      toolCalls,
      reasoning,
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      response: { id: "mock", timestamp: new Date(), modelId: "mock", headers: {} },
      request: {},
      toolResults: [],
      warnings: [],
      sources: [],
      providerMetadata: undefined,
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

function createMockSkillManager(
  name: string,
  type: "mcp" | "interactive" | "delegate",
  toolName: string,
): BaseSkillManager {
  return {
    name,
    type,
    lazyInit: false,
    _toolDefinitions: [{ name: toolName, skillName: name, inputSchema: {}, interactive: false }],
    _initialized: true,
    init: async () => {},
    isInitialized: () => true,
    getToolDefinitions: async () => [
      { name: toolName, skillName: name, inputSchema: {}, interactive: false },
    ],
    callTool: async () => [],
    close: async () => {},
  } as unknown as BaseSkillManager
}

describe("@perstack/runtime: StateMachineLogic['GeneratingToolCall']", () => {
  beforeEach(() => {
    mockLLMExecutor = createMockLLMExecutor()
  })

  it("returns completeRun event when text-only is generated (implicit completion)", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep()
    mockLLMExecutor.setMockResult(createMockResult())
    const event = await StateMachineLogics.GeneratingToolCall({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: {},
      llmExecutor: mockLLMExecutor as unknown as LLMExecutor,
    })
    expect(event.type).toBe("completeRun")
    expect(event.expertKey).toBe("test-expert")
    if (event.type === "completeRun") {
      expect(event.text).toBe("Generated text")
    }
  })

  it("returns retry event when no tool call and no text generated", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep()
    mockLLMExecutor.setMockResult(createMockResult({ text: "" }))
    const event = await StateMachineLogics.GeneratingToolCall({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: {},
      llmExecutor: mockLLMExecutor as unknown as LLMExecutor,
    })
    expect(event.type).toBe("retry")
    expect(event.expertKey).toBe("test-expert")
  })

  it("returns retry event on generation error", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep()
    mockLLMExecutor.setMockResult(
      createMockErrorResult({ name: "Error", message: "Model generation failed" }, true),
    )
    const event = await StateMachineLogics.GeneratingToolCall({
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
    const step = createStep()
    mockLLMExecutor.setMockResult(
      createMockErrorResult(
        { name: "APICallError", message: "Unauthorized", statusCode: 401 },
        false,
      ),
    )
    const event = await StateMachineLogics.GeneratingToolCall({
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
      expect(event.step.finishedAt).toBeDefined()
    }
  })

  it("returns retry event on retryable API error (429)", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep()
    mockLLMExecutor.setMockResult(
      createMockErrorResult(
        { name: "APICallError", message: "Rate limited", statusCode: 429 },
        true,
      ),
    )
    const event = await StateMachineLogics.GeneratingToolCall({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: {},
      llmExecutor: mockLLMExecutor as unknown as LLMExecutor,
    })
    expect(event.type).toBe("retry")
  })

  it("includes proper event metadata", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep()
    mockLLMExecutor.setMockResult(createMockResult())
    const event = await StateMachineLogics.GeneratingToolCall({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: {},
      llmExecutor: mockLLMExecutor as unknown as LLMExecutor,
    })
    expect(event.id).toBeDefined()
    expect(typeof event.id).toBe("string")
    expect(event.runId).toBe(setting.runId)
  })

  it("handles text-only response with stop finish reason", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep()
    mockLLMExecutor.setMockResult(createMockResult({ finishReason: "stop" }))
    const event = await StateMachineLogics.GeneratingToolCall({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: {},
      llmExecutor: mockLLMExecutor as unknown as LLMExecutor,
    })
    // Text-only with stop = implicit completion
    expect(event.type).toBe("completeRun")
    expect(event.runId).toBe(setting.runId)
  })

  it("returns completeRun with usage information for text-only response", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep()
    mockLLMExecutor.setMockResult(createMockResult())
    const event = await StateMachineLogics.GeneratingToolCall({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: {},
      llmExecutor: mockLLMExecutor as unknown as LLMExecutor,
    })
    expect(event.type).toBe("completeRun")
    expect((event as { usage?: { inputTokens: number } }).usage).toBeDefined()
  })

  it("returns callTool event for MCP skill", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep()
    const skillManager = createMockSkillManager("test-skill", "mcp", "testTool")
    mockLLMExecutor.setMockResult(
      createMockResult({
        finishReason: "tool-calls",
        toolCalls: [{ toolCallId: "tc_1", toolName: "testTool", args: { arg: "value" } }],
      }),
    )
    const event = await StateMachineLogics.GeneratingToolCall({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: { "test-skill": skillManager },
      llmExecutor: mockLLMExecutor as unknown as LLMExecutor,
    })
    expect(event.type).toBe("callTools")
  })

  it("returns callTools event for interactive skill (processed later in CallingTool)", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep()
    const skillManager = createMockSkillManager("interactive-skill", "interactive", "askUser")
    mockLLMExecutor.setMockResult(
      createMockResult({
        finishReason: "stop",
        toolCalls: [{ toolCallId: "tc_2", toolName: "askUser", args: { question: "?" } }],
      }),
    )
    const event = await StateMachineLogics.GeneratingToolCall({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: { "interactive-skill": skillManager },
      llmExecutor: mockLLMExecutor as unknown as LLMExecutor,
    })
    expect(event.type).toBe("callTools")
  })

  it("returns callTools event for delegate skill (processed later in CallingTool)", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep()
    const skillManager = createMockSkillManager("delegate-skill", "delegate", "delegateTask")
    mockLLMExecutor.setMockResult(
      createMockResult({
        finishReason: "tool-calls",
        toolCalls: [
          { toolCallId: "tc_3", toolName: "delegateTask", args: { task: "do something" } },
        ],
      }),
    )
    const event = await StateMachineLogics.GeneratingToolCall({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: { "delegate-skill": skillManager },
      llmExecutor: mockLLMExecutor as unknown as LLMExecutor,
    })
    expect(event.type).toBe("callTools")
  })

  it("sorts tool calls by priority: MCP → Delegate → Interactive", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep()
    const mcpSkillManager = createMockSkillManager("mcp-skill", "mcp", "mcpTool")
    const delegateSkillManager = createMockSkillManager(
      "delegate-skill",
      "delegate",
      "delegateTool",
    )
    const interactiveSkillManager = createMockSkillManager(
      "interactive-skill",
      "interactive",
      "interactiveTool",
    )
    mockLLMExecutor.setMockResult(
      createMockResult({
        finishReason: "tool-calls",
        toolCalls: [
          { toolCallId: "tc_int", toolName: "interactiveTool", args: {} },
          { toolCallId: "tc_del", toolName: "delegateTool", args: {} },
          { toolCallId: "tc_mcp", toolName: "mcpTool", args: {} },
        ],
      }),
    )
    const event = await StateMachineLogics.GeneratingToolCall({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: {
        "mcp-skill": mcpSkillManager,
        "delegate-skill": delegateSkillManager,
        "interactive-skill": interactiveSkillManager,
      },
      llmExecutor: mockLLMExecutor as unknown as LLMExecutor,
    })
    expect(event.type).toBe("callTools")
    if (event.type === "callTools") {
      expect(event.toolCalls[0].toolName).toBe("mcpTool")
      expect(event.toolCalls[1].toolName).toBe("delegateTool")
      expect(event.toolCalls[2].toolName).toBe("interactiveTool")
    }
  })

  it("returns retry event when finish reason is length", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep()
    const skillManager = createMockSkillManager("test-skill", "mcp", "testTool")
    mockLLMExecutor.setMockResult(
      createMockResult({
        finishReason: "length",
        toolCalls: [{ toolCallId: "tc_4", toolName: "testTool", args: {} }],
      }),
    )
    const event = await StateMachineLogics.GeneratingToolCall({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: { "test-skill": skillManager },
      llmExecutor: mockLLMExecutor as unknown as LLMExecutor,
    })
    expect(event.type).toBe("retry")
  })

  it("throws error for unexpected finish reason", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep()
    const skillManager = createMockSkillManager("test-skill", "mcp", "testTool")
    mockLLMExecutor.setMockResult(
      createMockResult({
        finishReason: "error" as "stop",
        toolCalls: [{ toolCallId: "tc_5", toolName: "testTool", args: {} }],
      }),
    )
    await expect(
      StateMachineLogics.GeneratingToolCall({
        setting,
        checkpoint,
        step,
        eventListener: async () => {},
        skillManagers: { "test-skill": skillManager },
        llmExecutor: mockLLMExecutor as unknown as LLMExecutor,
      }),
    ).rejects.toThrow("Unexpected finish reason: error")
  })

  it("includes text in expert message when present", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep()
    const skillManager = createMockSkillManager("test-skill", "mcp", "testTool")
    mockLLMExecutor.setMockResult(
      createMockResult({
        finishReason: "tool-calls",
        text: "Thinking about this...",
        toolCalls: [{ toolCallId: "tc_6", toolName: "testTool", args: {} }],
      }),
    )
    const event = await StateMachineLogics.GeneratingToolCall({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: { "test-skill": skillManager },
      llmExecutor: mockLLMExecutor as unknown as LLMExecutor,
    })
    expect(event.type).toBe("callTools")
  })

  it("returns stopRunByError when retryable error occurs but retryCount >= maxRetries", async () => {
    const setting = createRunSetting({ maxRetries: 3 })
    const checkpoint = createCheckpoint({ retryCount: 3 })
    const step = createStep()
    const skillManager = createMockSkillManager("test-skill", "mcp", "testTool")
    mockLLMExecutor.setMockResult(
      createMockErrorResult({ name: "RateLimitError", message: "Rate limited" }, true),
    )
    const event = await StateMachineLogics.GeneratingToolCall({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: { "test-skill": skillManager },
      llmExecutor: mockLLMExecutor as unknown as LLMExecutor,
    })
    expect(event.type).toBe("stopRunByError")
    if (event.type === "stopRunByError") {
      expect(event.error.message).toContain("Max retries (3) exceeded")
    }
  })

  it("returns stopRunByError when nothing generated and retryCount >= maxRetries", async () => {
    const setting = createRunSetting({ maxRetries: 3 })
    const checkpoint = createCheckpoint({ retryCount: 3 })
    const step = createStep()
    const skillManager = createMockSkillManager("test-skill", "mcp", "testTool")
    mockLLMExecutor.setMockResult(
      createMockResult({
        finishReason: "stop",
        text: "",
        toolCalls: [],
      }),
    )
    const event = await StateMachineLogics.GeneratingToolCall({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: { "test-skill": skillManager },
      llmExecutor: mockLLMExecutor as unknown as LLMExecutor,
    })
    expect(event.type).toBe("stopRunByError")
    if (event.type === "stopRunByError") {
      expect(event.error.message).toContain("Max retries (3) exceeded")
    }
  })

  it("returns stopRunByError when finish reason is length and retryCount >= maxRetries", async () => {
    const setting = createRunSetting({ maxRetries: 3 })
    const checkpoint = createCheckpoint({ retryCount: 3 })
    const step = createStep()
    const skillManager = createMockSkillManager("test-skill", "mcp", "testTool")
    mockLLMExecutor.setMockResult(
      createMockResult({
        finishReason: "length",
        toolCalls: [{ toolCallId: "tc_len", toolName: "testTool", args: {} }],
      }),
    )
    const event = await StateMachineLogics.GeneratingToolCall({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: { "test-skill": skillManager },
      llmExecutor: mockLLMExecutor as unknown as LLMExecutor,
    })
    expect(event.type).toBe("stopRunByError")
    if (event.type === "stopRunByError") {
      expect(event.error.message).toContain("Max retries (3) exceeded")
    }
  })
})
