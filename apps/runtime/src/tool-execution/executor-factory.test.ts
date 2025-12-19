import type { ToolCall } from "@perstack/core"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { BaseSkillManager } from "../skill-manager/base.js"
import { ToolExecutorFactory, toolExecutorFactory } from "./executor-factory.js"

// Mock getSkillManagerByToolName
vi.mock("../skill-manager/helpers.js", () => ({
  getSkillManagerByToolName: vi.fn(),
}))

const createMockSkillManager = (
  type: "mcp" | "delegate" | "interactive",
  callToolFn = vi.fn(),
): BaseSkillManager =>
  ({
    type,
    name: "mock-skill",
    lazyInit: false,
    init: vi.fn(),
    isInitialized: vi.fn().mockReturnValue(true),
    getToolDefinitions: vi.fn().mockResolvedValue([]),
    callTool: callToolFn,
    close: vi.fn(),
  }) as unknown as BaseSkillManager

describe("@perstack/runtime: executor-factory", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("ToolExecutorFactory", () => {
    describe("getExecutor()", () => {
      it("returns McpToolExecutor for 'mcp' type", () => {
        const factory = new ToolExecutorFactory()
        const executor = factory.getExecutor("mcp")

        expect(executor).toBeDefined()
        expect(executor?.type).toBe("mcp")
      })

      it("returns undefined for 'delegate' type (handled specially)", () => {
        const factory = new ToolExecutorFactory()
        const executor = factory.getExecutor("delegate")

        expect(executor).toBeUndefined()
      })

      it("returns undefined for 'interactive' type (handled specially)", () => {
        const factory = new ToolExecutorFactory()
        const executor = factory.getExecutor("interactive")

        expect(executor).toBeUndefined()
      })
    })

    describe("execute()", () => {
      it("executes MCP tool calls successfully", async () => {
        const { getSkillManagerByToolName } = await import("../skill-manager/helpers.js")
        const callToolFn = vi
          .fn()
          .mockResolvedValue([{ type: "textPart", id: "1", text: "result" }])
        const mcpManager = createMockSkillManager("mcp", callToolFn)
        vi.mocked(getSkillManagerByToolName).mockResolvedValue(mcpManager)

        const skillManagers: Record<string, BaseSkillManager> = {}
        const toolCall: ToolCall = {
          id: "call-1",
          skillName: "mcp1",
          toolName: "testTool",
          args: { arg1: "value" },
        }

        const factory = new ToolExecutorFactory()
        const result = await factory.execute(toolCall, "mcp", skillManagers)

        expect(result.id).toBe("call-1")
        expect(result.toolName).toBe("testTool")
        expect(callToolFn).toHaveBeenCalledWith("testTool", { arg1: "value" })
      })

      it("throws error for unregistered skill type", async () => {
        const skillManagers: Record<string, BaseSkillManager> = {}
        const toolCall: ToolCall = {
          id: "call-1",
          skillName: "delegate",
          toolName: "delegateTo",
          args: {},
        }

        const factory = new ToolExecutorFactory()
        await expect(factory.execute(toolCall, "delegate", skillManagers)).rejects.toThrow(
          "No executor registered for skill type: delegate",
        )
      })

      it("throws error for interactive skill type", async () => {
        const skillManagers: Record<string, BaseSkillManager> = {}
        const toolCall: ToolCall = {
          id: "call-1",
          skillName: "interactive",
          toolName: "askUser",
          args: {},
        }

        const factory = new ToolExecutorFactory()
        await expect(factory.execute(toolCall, "interactive", skillManagers)).rejects.toThrow(
          "No executor registered for skill type: interactive",
        )
      })
    })

    describe("canExecuteLocally()", () => {
      it("returns true for MCP type", () => {
        const factory = new ToolExecutorFactory()
        expect(factory.canExecuteLocally("mcp")).toBe(true)
      })

      it("returns false for delegate type", () => {
        const factory = new ToolExecutorFactory()
        expect(factory.canExecuteLocally("delegate")).toBe(false)
      })

      it("returns false for interactive type", () => {
        const factory = new ToolExecutorFactory()
        expect(factory.canExecuteLocally("interactive")).toBe(false)
      })
    })
  })

  describe("toolExecutorFactory singleton", () => {
    it("is an instance of ToolExecutorFactory", () => {
      expect(toolExecutorFactory).toBeInstanceOf(ToolExecutorFactory)
    })

    it("has MCP executor registered", () => {
      const executor = toolExecutorFactory.getExecutor("mcp")
      expect(executor).toBeDefined()
      expect(executor?.type).toBe("mcp")
    })
  })
})
