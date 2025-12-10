import { MockLanguageModelV2 } from "ai/test"
import { describe, expect, it, vi } from "vitest"
import { createCheckpoint, createRunSetting, createStep } from "../../../test/run-params.js"
import { StateMachineLogics } from "../index.js"
import type { BaseSkillManager } from "../../skill-manager/index.js"

const mockGetModel = vi.fn()
vi.mock("../../helpers/model.js", async (importOriginal) => ({
  ...(await importOriginal()),
  getModel: () => mockGetModel(),
}))

type ToolCallContent = {
  type: "tool-call"
  toolCallId: string
  toolName: string
  input: string
}

function createMockLanguageModel(
  options: {
    finishReason?: "stop" | "tool-calls" | "length" | "error"
    text?: string
    shouldError?: boolean
    toolCalls?: ToolCallContent[]
  } = {},
) {
  const {
    finishReason = "stop",
    text = "Generated text",
    shouldError = false,
    toolCalls = [],
  } = options
  return new MockLanguageModelV2({
    doGenerate: async () => {
      if (shouldError) {
        throw new Error("Model generation failed")
      }
      const content: Array<{ type: "text"; text: string } | ToolCallContent> = []
      if (text) {
        content.push({ type: "text", text })
      }
      for (const tc of toolCalls) {
        content.push(tc)
      }
      return {
        content,
        warnings: [],
        finishReason,
        usage: {
          inputTokens: 10,
          outputTokens: 20,
          reasoningTokens: 30,
          totalTokens: 60,
          cachedInputTokens: 40,
        },
      }
    },
  })
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
  it("returns retry event when no tool call generated", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep()
    mockGetModel.mockReturnValue(createMockLanguageModel())
    const event = await StateMachineLogics.GeneratingToolCall({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: {},
    })
    expect(event.type).toBe("retry")
    expect(event.expertKey).toBe("test-expert")
  })

  it("returns retry event on generation error", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep()
    mockGetModel.mockReturnValue(createMockLanguageModel({ shouldError: true }))
    const event = await StateMachineLogics.GeneratingToolCall({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: {},
    })
    expect(event.type).toBe("retry")
  })

  it("includes proper event metadata", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep()
    mockGetModel.mockReturnValue(createMockLanguageModel())
    const event = await StateMachineLogics.GeneratingToolCall({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: {},
    })
    expect(event.id).toBeDefined()
    expect(typeof event.id).toBe("string")
    expect(event.runId).toBe(setting.runId)
  })

  it("handles different finish reasons", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep()
    mockGetModel.mockReturnValue(createMockLanguageModel({ finishReason: "stop" }))
    const event = await StateMachineLogics.GeneratingToolCall({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: {},
    })
    expect(event.type).toBe("retry")
    expect(event.runId).toBe(setting.runId)
  })

  it("returns retry with usage information", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep()
    mockGetModel.mockReturnValue(createMockLanguageModel())
    const event = await StateMachineLogics.GeneratingToolCall({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: {},
    })
    expect(event.type).toBe("retry")
    expect((event as { usage?: { inputTokens: number } }).usage).toBeDefined()
  })

  it("returns callTool event for MCP skill", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep()
    const skillManager = createMockSkillManager("test-skill", "mcp", "testTool")
    mockGetModel.mockReturnValue(
      createMockLanguageModel({
        finishReason: "tool-calls",
        toolCalls: [
          {
            type: "tool-call",
            toolCallId: "tc_1",
            toolName: "testTool",
            input: JSON.stringify({ arg: "value" }),
          },
        ],
      }),
    )
    const event = await StateMachineLogics.GeneratingToolCall({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: { "test-skill": skillManager },
    })
    expect(event.type).toBe("callTools")
  })

  it("returns callTools event for interactive skill (processed later in CallingTool)", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep()
    const skillManager = createMockSkillManager("interactive-skill", "interactive", "askUser")
    mockGetModel.mockReturnValue(
      createMockLanguageModel({
        finishReason: "stop",
        toolCalls: [
          {
            type: "tool-call",
            toolCallId: "tc_2",
            toolName: "askUser",
            input: JSON.stringify({ question: "?" }),
          },
        ],
      }),
    )
    const event = await StateMachineLogics.GeneratingToolCall({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: { "interactive-skill": skillManager },
    })
    expect(event.type).toBe("callTools")
  })

  it("returns callTools event for delegate skill (processed later in CallingTool)", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep()
    const skillManager = createMockSkillManager("delegate-skill", "delegate", "delegateTask")
    mockGetModel.mockReturnValue(
      createMockLanguageModel({
        finishReason: "tool-calls",
        toolCalls: [
          {
            type: "tool-call",
            toolCallId: "tc_3",
            toolName: "delegateTask",
            input: JSON.stringify({ task: "do something" }),
          },
        ],
      }),
    )
    const event = await StateMachineLogics.GeneratingToolCall({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: { "delegate-skill": skillManager },
    })
    expect(event.type).toBe("callTools")
  })

  it("sorts tool calls by priority: MCP → Delegate → Interactive", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep()
    const mcpSkillManager = createMockSkillManager("mcp-skill", "mcp", "mcpTool")
    const delegateSkillManager = createMockSkillManager("delegate-skill", "delegate", "delegateTool")
    const interactiveSkillManager = createMockSkillManager(
      "interactive-skill",
      "interactive",
      "interactiveTool",
    )
    mockGetModel.mockReturnValue(
      createMockLanguageModel({
        finishReason: "tool-calls",
        toolCalls: [
          { type: "tool-call", toolCallId: "tc_int", toolName: "interactiveTool", input: "{}" },
          { type: "tool-call", toolCallId: "tc_del", toolName: "delegateTool", input: "{}" },
          { type: "tool-call", toolCallId: "tc_mcp", toolName: "mcpTool", input: "{}" },
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
    mockGetModel.mockReturnValue(
      createMockLanguageModel({
        finishReason: "length",
        toolCalls: [{ type: "tool-call", toolCallId: "tc_4", toolName: "testTool", input: "{}" }],
      }),
    )
    const event = await StateMachineLogics.GeneratingToolCall({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: { "test-skill": skillManager },
    })
    expect(event.type).toBe("retry")
  })

  it("throws error for unexpected finish reason", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep()
    const skillManager = createMockSkillManager("test-skill", "mcp", "testTool")
    mockGetModel.mockReturnValue(
      createMockLanguageModel({
        finishReason: "error" as "stop",
        toolCalls: [{ type: "tool-call", toolCallId: "tc_5", toolName: "testTool", input: "{}" }],
      }),
    )
    await expect(
      StateMachineLogics.GeneratingToolCall({
        setting,
        checkpoint,
        step,
        eventListener: async () => {},
        skillManagers: { "test-skill": skillManager },
      }),
    ).rejects.toThrow("Unexpected finish reason: error")
  })

  it("includes text in expert message when present", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep()
    const skillManager = createMockSkillManager("test-skill", "mcp", "testTool")
    mockGetModel.mockReturnValue(
      createMockLanguageModel({
        finishReason: "tool-calls",
        text: "Thinking about this...",
        toolCalls: [{ type: "tool-call", toolCallId: "tc_6", toolName: "testTool", input: "{}" }],
      }),
    )
    const event = await StateMachineLogics.GeneratingToolCall({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: { "test-skill": skillManager },
    })
    expect(event.type).toBe("callTools")
  })
})
