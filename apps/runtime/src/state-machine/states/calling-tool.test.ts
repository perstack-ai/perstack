import { createId } from "@paralleldrive/cuid2"
import { describe, expect, it, vi } from "vitest"
import { createCheckpoint, createRunSetting, createStep } from "../../../test/run-params.js"
import type { LLMExecutor } from "../../llm/index.js"
import { createMockLLMExecutor } from "../../llm/index.js"
import type { BaseSkillManager } from "../../skill-manager/index.js"
import { callingToolLogic } from "./calling-tool.js"

const mockLLMExecutor = createMockLLMExecutor() as unknown as LLMExecutor

type CallToolResult = Array<{ type: string; text?: string; id: string }>
type CallToolFn = (toolName: string, args: unknown) => Promise<CallToolResult>

function createMockMcpSkillManager(
  name: string,
  toolNames: string | string[],
  callToolFnOrResult?: CallToolFn | CallToolResult,
): BaseSkillManager {
  const tools = Array.isArray(toolNames) ? toolNames : [toolNames]
  const defaultCallTool = async () => [
    { type: "textPart", text: "Tool executed successfully", id: createId() },
  ]
  const callTool: CallToolFn =
    callToolFnOrResult === undefined
      ? defaultCallTool
      : typeof callToolFnOrResult === "function"
        ? callToolFnOrResult
        : async () => callToolFnOrResult
  return {
    name,
    type: "mcp" as const,
    lazyInit: false,
    _toolDefinitions: tools.map((t) => ({
      name: t,
      skillName: name,
      inputSchema: {},
      interactive: false,
    })),
    _initialized: true,
    init: async () => {},
    isInitialized: () => true,
    getToolDefinitions: async () =>
      tools.map((t) => ({ name: t, skillName: name, inputSchema: {}, interactive: false })),
    callTool,
    close: async () => {},
  } as unknown as BaseSkillManager
}

function createMockDelegateSkillManager(name: string): BaseSkillManager {
  return {
    name,
    type: "delegate" as const,
    lazyInit: false,
    _toolDefinitions: [],
    _initialized: true,
    expert: { key: name, name, version: "1.0.0" },
    init: async () => {},
    isInitialized: () => true,
    getToolDefinitions: async () => [
      { name, skillName: name, inputSchema: {}, interactive: false },
    ],
    callTool: async () => [],
    close: async () => {},
  } as unknown as BaseSkillManager
}

function createMockInteractiveSkillManager(name: string, toolName: string): BaseSkillManager {
  return {
    name,
    type: "interactive" as const,
    lazyInit: false,
    _toolDefinitions: [{ name: toolName, skillName: name, inputSchema: {}, interactive: true }],
    _initialized: true,
    init: async () => {},
    isInitialized: () => true,
    getToolDefinitions: async () => [
      { name: toolName, skillName: name, inputSchema: {}, interactive: true },
    ],
    callTool: async () => [],
    close: async () => {},
  } as unknown as BaseSkillManager
}

describe("@perstack/runtime: callingToolLogic", () => {
  describe("parallel tool execution", () => {
    it("executes multiple tools in parallel and returns all results", async () => {
      const setting = createRunSetting()
      const checkpoint = createCheckpoint()
      const step = createStep({
        toolCalls: [
          { id: "tc_1", skillName: "skill-a", toolName: "tool1", args: { x: 1 } },
          { id: "tc_2", skillName: "skill-a", toolName: "tool2", args: { x: 2 } },
          { id: "tc_3", skillName: "skill-b", toolName: "tool3", args: { x: 3 } },
        ],
      })
      const callToolA = vi.fn(async (toolName: string) => [
        { type: "textPart", text: `Result from ${toolName}`, id: createId() },
      ])
      const callToolB = vi.fn(async (toolName: string) => [
        { type: "textPart", text: `Result from ${toolName}`, id: createId() },
      ])
      const skillManagers = {
        "skill-a": createMockMcpSkillManager("skill-a", ["tool1", "tool2"], callToolA),
        "skill-b": createMockMcpSkillManager("skill-b", ["tool3"], callToolB),
      }
      const event = await callingToolLogic({
        setting,
        checkpoint,
        step,
        eventListener: async () => {},
        skillManagers,
        llmExecutor: mockLLMExecutor,
      })
      expect(event.type).toBe("resolveToolResults")
      if (event.type === "resolveToolResults") {
        expect(event.toolResults).toHaveLength(3)
        expect(event.toolResults[0].id).toBe("tc_1")
        expect(event.toolResults[1].id).toBe("tc_2")
        expect(event.toolResults[2].id).toBe("tc_3")
      }
      expect(callToolA).toHaveBeenCalledTimes(2)
      expect(callToolB).toHaveBeenCalledTimes(1)
    })

    it("preserves tool call order in results", async () => {
      const setting = createRunSetting()
      const checkpoint = createCheckpoint()
      const step = createStep({
        toolCalls: [
          { id: "tc_first", skillName: "test-skill", toolName: "slowTool", args: {} },
          { id: "tc_second", skillName: "test-skill", toolName: "fastTool", args: {} },
        ],
      })
      const callTool = vi.fn(async (toolName: string) => {
        if (toolName === "slowTool") {
          await new Promise((r) => setTimeout(r, 50))
        }
        return [{ type: "textPart", text: toolName, id: createId() }]
      })
      const skillManagers = {
        "test-skill": createMockMcpSkillManager("test-skill", ["slowTool", "fastTool"], callTool),
      }
      const event = await callingToolLogic({
        setting,
        checkpoint,
        step,
        eventListener: async () => {},
        skillManagers,
        llmExecutor: mockLLMExecutor,
      })
      expect(event.type).toBe("resolveToolResults")
      if (event.type === "resolveToolResults") {
        expect(event.toolResults[0].id).toBe("tc_first")
        expect(event.toolResults[1].id).toBe("tc_second")
      }
    })

    it("executes tools concurrently (not sequentially)", async () => {
      const setting = createRunSetting()
      const checkpoint = createCheckpoint()
      const step = createStep({
        toolCalls: [
          { id: "tc_1", skillName: "test-skill", toolName: "tool1", args: {} },
          { id: "tc_2", skillName: "test-skill", toolName: "tool2", args: {} },
          { id: "tc_3", skillName: "test-skill", toolName: "tool3", args: {} },
        ],
      })
      const DELAY_MS = 30
      const callTool = vi.fn(async () => {
        await new Promise((r) => setTimeout(r, DELAY_MS))
        return [{ type: "textPart", text: "done", id: createId() }]
      })
      const skillManagers = {
        "test-skill": createMockMcpSkillManager(
          "test-skill",
          ["tool1", "tool2", "tool3"],
          callTool,
        ),
      }
      const start = Date.now()
      await callingToolLogic({
        setting,
        checkpoint,
        step,
        eventListener: async () => {},
        skillManagers,
        llmExecutor: mockLLMExecutor,
      })
      const elapsed = Date.now() - start
      expect(elapsed).toBeLessThan(DELAY_MS * 2)
    })
  })

  describe("single tool execution", () => {
    it("executes single tool and returns resolveToolResults event", async () => {
      const setting = createRunSetting()
      const checkpoint = createCheckpoint()
      const step = createStep({
        toolCalls: [
          { id: "tc_123", skillName: "test-skill", toolName: "testTool", args: { param: "value" } },
        ],
      })
      const skillManagers = {
        "test-skill": createMockMcpSkillManager("test-skill", "testTool"),
      }
      const event = await callingToolLogic({
        setting,
        checkpoint,
        step,
        eventListener: async () => {},
        skillManagers,
        llmExecutor: mockLLMExecutor,
      })
      expect(event.type).toBe("resolveToolResults")
      expect(event.expertKey).toBe(setting.expertKey)
      expect(event.runId).toBe(setting.runId)
    })
  })

  describe("error handling", () => {
    it("throws error when tool calls are missing", async () => {
      const setting = createRunSetting()
      const checkpoint = createCheckpoint()
      const step = createStep({ toolCalls: undefined })
      await expect(
        callingToolLogic({
          setting,
          checkpoint,
          step,
          eventListener: async () => {},
          skillManagers: {},
          llmExecutor: mockLLMExecutor,
        }),
      ).rejects.toThrow("No tool calls found")
    })

    it("returns callDelegate event for delegate skill", async () => {
      const setting = createRunSetting()
      const checkpoint = createCheckpoint()
      const step = createStep({
        toolCalls: [
          { id: "tc_123", skillName: "delegate-skill", toolName: "delegate-skill", args: {} },
        ],
      })
      const skillManagers = {
        "delegate-skill": createMockDelegateSkillManager("delegate-skill"),
      }
      const event = await callingToolLogic({
        setting,
        checkpoint,
        step,
        eventListener: async () => {},
        skillManagers,
        llmExecutor: mockLLMExecutor,
      })
      expect(event.type).toBe("callDelegate")
    })

    it("returns callInteractiveTool event for interactive skill", async () => {
      const setting = createRunSetting()
      const checkpoint = createCheckpoint()
      const step = createStep({
        toolCalls: [
          { id: "tc_123", skillName: "interactive-skill", toolName: "humanApproval", args: {} },
        ],
      })
      const skillManagers = {
        "interactive-skill": createMockInteractiveSkillManager(
          "interactive-skill",
          "humanApproval",
        ),
      }
      const event = await callingToolLogic({
        setting,
        checkpoint,
        step,
        eventListener: async () => {},
        skillManagers,
        llmExecutor: mockLLMExecutor,
      })
      expect(event.type).toBe("callInteractiveTool")
    })

    it("throws error when tool not found in skill managers", async () => {
      const setting = createRunSetting()
      const checkpoint = createCheckpoint()
      const step = createStep({
        toolCalls: [
          { id: "tc_123", skillName: "unknown-skill", toolName: "unknownTool", args: {} },
        ],
      })
      await expect(
        callingToolLogic({
          setting,
          checkpoint,
          step,
          eventListener: async () => {},
          skillManagers: {},
          llmExecutor: mockLLMExecutor,
        }),
      ).rejects.toThrow("Tool unknownTool not found")
    })
  })

  it("routes think tool to resolveToolResults handler", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep({
      toolCalls: [
        {
          id: "tc_123",
          skillName: "@perstack/base",
          toolName: "think",
          args: { thought: "thinking..." },
        },
      ],
    })
    const skillManagers = {
      "@perstack/base": createMockMcpSkillManager("@perstack/base", "think"),
    }
    const event = await callingToolLogic({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers,
      llmExecutor: mockLLMExecutor,
    })
    expect(event.type).toBe("resolveToolResults")
  })

  it("routes attemptCompletion to attemptCompletion handler when no remaining todos", async () => {
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
    })
    const emptyResult = [{ type: "textPart", text: JSON.stringify({}), id: createId() }]
    const skillManagers = {
      "@perstack/base": createMockMcpSkillManager(
        "@perstack/base",
        "attemptCompletion",
        emptyResult,
      ),
    }
    const event = await callingToolLogic({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers,
      llmExecutor: mockLLMExecutor,
    })
    expect(event.type).toBe("attemptCompletion")
  })

  it("routes attemptCompletion to resolveToolResults when remaining todos exist", async () => {
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
    })
    const remainingTodosResult = [
      {
        type: "textPart",
        text: JSON.stringify({ remainingTodos: [{ id: 0, title: "Task 1", completed: false }] }),
        id: createId(),
      },
    ]
    const skillManagers = {
      "@perstack/base": createMockMcpSkillManager(
        "@perstack/base",
        "attemptCompletion",
        remainingTodosResult,
      ),
    }
    const event = await callingToolLogic({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers,
      llmExecutor: mockLLMExecutor,
    })
    expect(event.type).toBe("resolveToolResults")
  })

  it("routes readPdfFile tool to resolveToolResults handler", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep({
      toolCalls: [
        {
          id: "tc_123",
          skillName: "@perstack/base",
          toolName: "readPdfFile",
          args: { path: "/test.pdf" },
        },
      ],
    })
    const pdfResult = [{ type: "textPart", text: "PDF content", id: createId() }]
    const skillManagers = {
      "@perstack/base": createMockMcpSkillManager("@perstack/base", "readPdfFile", pdfResult),
    }
    const event = await callingToolLogic({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers,
      llmExecutor: mockLLMExecutor,
    })
    expect(event.type).toBe("resolveToolResults")
  })

  it("routes readImageFile tool to resolveToolResults handler", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep({
      toolCalls: [
        {
          id: "tc_123",
          skillName: "@perstack/base",
          toolName: "readImageFile",
          args: { path: "/test.png" },
        },
      ],
    })
    const imageResult = [
      { type: "imageInlinePart", encodedData: "base64data", mimeType: "image/png", id: createId() },
    ]
    const skillManagers = {
      "@perstack/base": createMockMcpSkillManager("@perstack/base", "readImageFile", imageResult),
    }
    const event = await callingToolLogic({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers,
      llmExecutor: mockLLMExecutor,
    })
    expect(event.type).toBe("resolveToolResults")
  })

  it("routes non-special @perstack/base tools to resolveToolResults", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep({
      toolCalls: [
        {
          id: "tc_123",
          skillName: "@perstack/base",
          toolName: "readTextFile",
          args: { path: "/test.txt" },
        },
      ],
    })
    const skillManagers = {
      "@perstack/base": createMockMcpSkillManager("@perstack/base", "readTextFile"),
    }
    const event = await callingToolLogic({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers,
      llmExecutor: mockLLMExecutor,
    })
    expect(event.type).toBe("resolveToolResults")
  })

  it("throws error when tool not found in skill managers", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep({
      toolCalls: [
        {
          id: "tc_123",
          skillName: "unknown-skill",
          toolName: "unknownTool",
          args: {},
        },
      ],
    })
    await expect(
      callingToolLogic({
        setting,
        checkpoint,
        step,
        eventListener: async () => {},
        skillManagers: {},
        llmExecutor: mockLLMExecutor,
      }),
    ).rejects.toThrow("Tool unknownTool not found")
  })

  it("executes multiple tools in parallel", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep({
      toolCalls: [
        {
          id: "tc_1",
          skillName: "test-skill",
          toolName: "testTool1",
          args: { param: "value1" },
        },
        {
          id: "tc_2",
          skillName: "test-skill",
          toolName: "testTool2",
          args: { param: "value2" },
        },
      ],
    })
    const skillManagers = {
      "test-skill": {
        name: "test-skill",
        type: "mcp" as const,
        lazyInit: false,
        _toolDefinitions: [
          { name: "testTool1", skillName: "test-skill", inputSchema: {}, interactive: false },
          { name: "testTool2", skillName: "test-skill", inputSchema: {}, interactive: false },
        ],
        _initialized: true,
        init: async () => {},
        isInitialized: () => true,
        getToolDefinitions: async () => [
          { name: "testTool1", skillName: "test-skill", inputSchema: {}, interactive: false },
          { name: "testTool2", skillName: "test-skill", inputSchema: {}, interactive: false },
        ],
        callTool: async () => [{ type: "textPart", text: "Success", id: createId() }],
        close: async () => {},
      } as unknown as BaseSkillManager,
    }
    const event = await callingToolLogic({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers,
      llmExecutor: mockLLMExecutor,
    })
    expect(event.type).toBe("resolveToolResults")
    if (event.type === "resolveToolResults") {
      expect(event.toolResults).toHaveLength(2)
    }
  })

  describe("mixed tool types", () => {
    it("executes MCP tools first then calls delegate", async () => {
      const setting = createRunSetting()
      const checkpoint = createCheckpoint()
      const step = createStep({
        toolCalls: [
          { id: "tc_mcp", skillName: "mcp-skill", toolName: "mcpTool", args: {} },
          { id: "tc_delegate", skillName: "delegate-skill", toolName: "delegate-skill", args: {} },
        ],
      })
      const skillManagers = {
        "mcp-skill": createMockMcpSkillManager("mcp-skill", "mcpTool"),
        "delegate-skill": createMockDelegateSkillManager("delegate-skill"),
      }
      const event = await callingToolLogic({
        setting,
        checkpoint,
        step,
        eventListener: async () => {},
        skillManagers,
        llmExecutor: mockLLMExecutor,
      })
      expect(event.type).toBe("callDelegate")
      expect(step.partialToolResults).toHaveLength(1)
      expect(step.partialToolResults?.[0]?.toolName).toBe("mcpTool")
    })

    it("executes MCP tools first then calls interactive", async () => {
      const setting = createRunSetting()
      const checkpoint = createCheckpoint()
      const step = createStep({
        toolCalls: [
          { id: "tc_mcp", skillName: "mcp-skill", toolName: "mcpTool", args: {} },
          {
            id: "tc_interactive",
            skillName: "interactive-skill",
            toolName: "humanApproval",
            args: {},
          },
        ],
      })
      const skillManagers = {
        "mcp-skill": createMockMcpSkillManager("mcp-skill", "mcpTool"),
        "interactive-skill": createMockInteractiveSkillManager(
          "interactive-skill",
          "humanApproval",
        ),
      }
      const event = await callingToolLogic({
        setting,
        checkpoint,
        step,
        eventListener: async () => {},
        skillManagers,
        llmExecutor: mockLLMExecutor,
      })
      expect(event.type).toBe("callInteractiveTool")
      expect(step.partialToolResults).toHaveLength(1)
      expect(step.partialToolResults?.[0]?.toolName).toBe("mcpTool")
    })

    it("delegates before interactive when both exist", async () => {
      const setting = createRunSetting()
      const checkpoint = createCheckpoint()
      const step = createStep({
        toolCalls: [
          { id: "tc_delegate", skillName: "delegate-skill", toolName: "delegate-skill", args: {} },
          {
            id: "tc_interactive",
            skillName: "interactive-skill",
            toolName: "humanApproval",
            args: {},
          },
        ],
      })
      const skillManagers = {
        "delegate-skill": createMockDelegateSkillManager("delegate-skill"),
        "interactive-skill": createMockInteractiveSkillManager(
          "interactive-skill",
          "humanApproval",
        ),
      }
      const event = await callingToolLogic({
        setting,
        checkpoint,
        step,
        eventListener: async () => {},
        skillManagers,
        llmExecutor: mockLLMExecutor,
      })
      expect(event.type).toBe("callDelegate")
      expect(step.pendingToolCalls).toHaveLength(2)
    })
  })
})
