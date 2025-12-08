import { createId } from "@paralleldrive/cuid2"
import { describe, expect, it } from "vitest"
import { createCheckpoint, createRunSetting, createStep } from "../../test/run-params.js"
import type { BaseSkillManager } from "../skill-manager/index.js"
import { callingToolLogic } from "./calling-tool.js"

function createMockMcpSkillManager(
  name: string,
  toolName: string,
  callToolResult: Array<{ type: string; text?: string; id: string }> = [
    { type: "textPart", text: "Tool executed successfully", id: createId() },
  ],
): BaseSkillManager {
  return {
    name,
    type: "mcp" as const,
    lazyInit: false,
    _toolDefinitions: [{ name: toolName, skillName: name, inputSchema: {}, interactive: false }],
    _initialized: true,
    init: async () => {},
    isInitialized: () => true,
    getToolDefinitions: async () => [
      { name: toolName, skillName: name, inputSchema: {}, interactive: false },
    ],
    callTool: async () => callToolResult,
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

describe("@perstack/runtime: callingToolLogic", () => {
  it("executes tool and returns resolveToolResults event", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep({
      toolCalls: [
        {
          id: "tc_123",
          skillName: "test-skill",
          toolName: "testTool",
          args: { param: "value" },
        },
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
    })
    expect(event.type).toBe("resolveToolResults")
    expect(event.expertKey).toBe(setting.expertKey)
    expect(event.runId).toBe(setting.runId)
  })

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
      }),
    ).rejects.toThrow("No tool calls found")
  })

  it("throws error when skill type is not mcp", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep({
      toolCalls: [
        {
          id: "tc_123",
          skillName: "delegate-skill",
          toolName: "delegate-skill",
          args: { query: "test" },
        },
      ],
    })
    const skillManagers = {
      "delegate-skill": createMockDelegateSkillManager("delegate-skill"),
    }
    await expect(
      callingToolLogic({
        setting,
        checkpoint,
        step,
        eventListener: async () => {},
        skillManagers,
      }),
    ).rejects.toThrow("Incorrect SkillType, required MCP, got delegate")
  })

  it("routes think tool to resolveThought handler", async () => {
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
    })
    expect(event.type).toBe("resolveThought")
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
    })
    expect(event.type).toBe("resolveToolResults")
  })

  it("routes readPdfFile tool to resolvePdfFile handler", async () => {
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
    })
    expect(event.type).toBe("resolvePdfFile")
  })

  it("routes readImageFile tool to resolveImageFile handler", async () => {
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
    })
    expect(event.type).toBe("resolveImageFile")
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
    })
    expect(event.type).toBe("resolveToolResults")
    if (event.type === "resolveToolResults") {
      expect(event.toolResults).toHaveLength(2)
    }
  })
})
