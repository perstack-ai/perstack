import type { SkillType, ToolCall } from "@perstack/core"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { BaseSkillManager } from "../skill-manager/base.js"
import { classifyToolCalls, getToolTypeByName } from "./tool-classifier.js"

// Mock getSkillManagerByToolName
vi.mock("../skill-manager/helpers.js", () => ({
  getSkillManagerByToolName: vi.fn(),
}))

const createMockSkillManager = (type: SkillType): BaseSkillManager =>
  ({
    type,
    name: "mock-skill",
    lazyInit: false,
    init: vi.fn(),
    isInitialized: vi.fn().mockReturnValue(true),
    getToolDefinitions: vi.fn().mockResolvedValue([]),
    callTool: vi.fn(),
    close: vi.fn(),
  }) as unknown as BaseSkillManager

describe("@perstack/runtime: tool-classifier", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("getToolTypeByName()", () => {
    it("returns the skill type for a tool found in skill managers", async () => {
      const { getSkillManagerByToolName } = await import("../skill-manager/helpers.js")
      const mcpManager = createMockSkillManager("mcp")
      vi.mocked(getSkillManagerByToolName).mockResolvedValue(mcpManager)

      const skillManagers: Record<string, BaseSkillManager> = {
        mcp1: mcpManager,
      }

      const result = await getToolTypeByName("readFile", skillManagers)
      expect(result).toBe("mcp")
      expect(getSkillManagerByToolName).toHaveBeenCalledWith(skillManagers, "readFile")
    })

    it("returns delegate type for delegate tool", async () => {
      const { getSkillManagerByToolName } = await import("../skill-manager/helpers.js")
      const delegateManager = createMockSkillManager("delegate")
      vi.mocked(getSkillManagerByToolName).mockResolvedValue(delegateManager)

      const skillManagers: Record<string, BaseSkillManager> = {}
      const result = await getToolTypeByName("delegateTo", skillManagers)
      expect(result).toBe("delegate")
    })

    it("returns interactive type for interactive tool", async () => {
      const { getSkillManagerByToolName } = await import("../skill-manager/helpers.js")
      const interactiveManager = createMockSkillManager("interactive")
      vi.mocked(getSkillManagerByToolName).mockResolvedValue(interactiveManager)

      const skillManagers: Record<string, BaseSkillManager> = {}
      const result = await getToolTypeByName("askUser", skillManagers)
      expect(result).toBe("interactive")
    })
  })

  describe("classifyToolCalls()", () => {
    const createToolCall = (id: string, toolName: string): ToolCall => ({
      id,
      skillName: "test-skill",
      toolName,
      args: {},
    })

    it("classifies tool calls by their type", async () => {
      const { getSkillManagerByToolName } = await import("../skill-manager/helpers.js")
      const mcpManager = createMockSkillManager("mcp")
      const delegateManager = createMockSkillManager("delegate")
      const interactiveManager = createMockSkillManager("interactive")

      vi.mocked(getSkillManagerByToolName)
        .mockResolvedValueOnce(mcpManager)
        .mockResolvedValueOnce(delegateManager)
        .mockResolvedValueOnce(interactiveManager)

      const skillManagers: Record<string, BaseSkillManager> = {}
      const toolCalls: ToolCall[] = [
        createToolCall("1", "readFile"),
        createToolCall("2", "delegateTo"),
        createToolCall("3", "askUser"),
      ]

      const classified = await classifyToolCalls(toolCalls, skillManagers)

      expect(classified.mcp).toHaveLength(1)
      expect(classified.mcp[0].toolCall.toolName).toBe("readFile")
      expect(classified.mcp[0].skillManager).toBe(mcpManager)

      expect(classified.delegate).toHaveLength(1)
      expect(classified.delegate[0].toolCall.toolName).toBe("delegateTo")

      expect(classified.interactive).toHaveLength(1)
      expect(classified.interactive[0].toolCall.toolName).toBe("askUser")
    })

    it("handles multiple tool calls of the same type", async () => {
      const { getSkillManagerByToolName } = await import("../skill-manager/helpers.js")
      const mcpManager = createMockSkillManager("mcp")

      vi.mocked(getSkillManagerByToolName)
        .mockResolvedValueOnce(mcpManager)
        .mockResolvedValueOnce(mcpManager)
        .mockResolvedValueOnce(mcpManager)

      const skillManagers: Record<string, BaseSkillManager> = {}
      const toolCalls: ToolCall[] = [
        createToolCall("1", "readFile"),
        createToolCall("2", "writeFile"),
        createToolCall("3", "listDir"),
      ]

      const classified = await classifyToolCalls(toolCalls, skillManagers)

      expect(classified.mcp).toHaveLength(3)
      expect(classified.delegate).toHaveLength(0)
      expect(classified.interactive).toHaveLength(0)
    })

    it("returns empty arrays when no tool calls", async () => {
      const skillManagers: Record<string, BaseSkillManager> = {}
      const classified = await classifyToolCalls([], skillManagers)

      expect(classified.mcp).toHaveLength(0)
      expect(classified.delegate).toHaveLength(0)
      expect(classified.interactive).toHaveLength(0)
    })

    it("includes skill manager reference for each classified tool call", async () => {
      const { getSkillManagerByToolName } = await import("../skill-manager/helpers.js")
      const mcpManager = createMockSkillManager("mcp")
      const delegateManager = createMockSkillManager("delegate")

      vi.mocked(getSkillManagerByToolName)
        .mockResolvedValueOnce(mcpManager)
        .mockResolvedValueOnce(delegateManager)

      const skillManagers: Record<string, BaseSkillManager> = {}
      const toolCalls: ToolCall[] = [
        createToolCall("1", "readFile"),
        createToolCall("2", "delegateTo"),
      ]

      const classified = await classifyToolCalls(toolCalls, skillManagers)

      expect(classified.mcp[0].skillManager).toBe(mcpManager)
      expect(classified.delegate[0].skillManager).toBe(delegateManager)
    })

    it("preserves tool call data in classified results", async () => {
      const { getSkillManagerByToolName } = await import("../skill-manager/helpers.js")
      const mcpManager = createMockSkillManager("mcp")

      vi.mocked(getSkillManagerByToolName).mockResolvedValue(mcpManager)

      const skillManagers: Record<string, BaseSkillManager> = {}
      const toolCall: ToolCall = {
        id: "tc-123",
        skillName: "fs-skill",
        toolName: "customTool",
        args: { foo: "bar", count: 42 },
      }

      const classified = await classifyToolCalls([toolCall], skillManagers)

      expect(classified.mcp[0].toolCall).toBe(toolCall)
      expect(classified.mcp[0].toolCall.id).toBe("tc-123")
      expect(classified.mcp[0].toolCall.args).toEqual({ foo: "bar", count: 42 })
    })
  })
})
