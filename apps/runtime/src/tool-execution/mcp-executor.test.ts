import type { ToolCall } from "@perstack/core"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { BaseSkillManager } from "../skill-manager/base.js"
import { McpToolExecutor } from "./mcp-executor.js"

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

describe("@perstack/runtime: mcp-executor", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("McpToolExecutor", () => {
    it("has type 'mcp'", () => {
      const executor = new McpToolExecutor()
      expect(executor.type).toBe("mcp")
    })

    it("executes a simple tool call and returns result", async () => {
      const { getSkillManagerByToolName } = await import("../skill-manager/helpers.js")
      const callToolFn = vi
        .fn()
        .mockResolvedValue([{ type: "textPart", id: "1", text: "Hello, World!" }])
      const mcpManager = createMockSkillManager("mcp", callToolFn)
      vi.mocked(getSkillManagerByToolName).mockResolvedValue(mcpManager)

      const skillManagers: Record<string, BaseSkillManager> = {}
      const toolCall: ToolCall = {
        id: "call-1",
        skillName: "myMcp",
        toolName: "greet",
        args: { name: "World" },
      }

      const executor = new McpToolExecutor()
      const result = await executor.execute(toolCall, skillManagers)

      expect(result.id).toBe("call-1")
      expect(result.skillName).toBe("myMcp")
      expect(result.toolName).toBe("greet")
      expect(result.result).toEqual([{ type: "textPart", id: "1", text: "Hello, World!" }])
      expect(callToolFn).toHaveBeenCalledWith("greet", { name: "World" })
    })

    it("throws error if skill manager is not MCP type", async () => {
      const { getSkillManagerByToolName } = await import("../skill-manager/helpers.js")
      const delegateManager = createMockSkillManager("delegate")
      vi.mocked(getSkillManagerByToolName).mockResolvedValue(delegateManager)

      const skillManagers: Record<string, BaseSkillManager> = {}
      const toolCall: ToolCall = {
        id: "call-1",
        skillName: "delegate",
        toolName: "delegateTo",
        args: {},
      }

      const executor = new McpToolExecutor()
      await expect(executor.execute(toolCall, skillManagers)).rejects.toThrow(
        "Incorrect SkillType, required MCP, got delegate",
      )
    })

    it("handles readImageFile tool with valid FileInfo", async () => {
      const { getSkillManagerByToolName } = await import("../skill-manager/helpers.js")
      const fileInfo = JSON.stringify({
        path: "/tmp/test.png",
        mimeType: "image/png",
        size: 1024,
      })
      const callToolFn = vi
        .fn()
        .mockResolvedValue([{ type: "textPart", id: "part-1", text: fileInfo }])
      const mcpManager = createMockSkillManager("mcp", callToolFn)
      vi.mocked(getSkillManagerByToolName).mockResolvedValue(mcpManager)

      const skillManagers: Record<string, BaseSkillManager> = {}
      const toolCall: ToolCall = {
        id: "call-1",
        skillName: "files",
        toolName: "readImageFile",
        args: { path: "/tmp/test.png" },
      }

      const executor = new McpToolExecutor()

      // This will fail because the file doesn't exist, but we can test the error path
      const result = await executor.execute(toolCall, skillManagers)

      expect(result.id).toBe("call-1")
      expect(result.result).toHaveLength(1)
      expect(result.result[0].type).toBe("textPart")
      expect((result.result[0] as { text: string }).text).toContain("Failed to read file")
    })

    it("handles readPdfFile tool with valid FileInfo", async () => {
      const { getSkillManagerByToolName } = await import("../skill-manager/helpers.js")
      const fileInfo = JSON.stringify({
        path: "/tmp/test.pdf",
        mimeType: "application/pdf",
        size: 2048,
      })
      const callToolFn = vi
        .fn()
        .mockResolvedValue([{ type: "textPart", id: "part-1", text: fileInfo }])
      const mcpManager = createMockSkillManager("mcp", callToolFn)
      vi.mocked(getSkillManagerByToolName).mockResolvedValue(mcpManager)

      const skillManagers: Record<string, BaseSkillManager> = {}
      const toolCall: ToolCall = {
        id: "call-1",
        skillName: "files",
        toolName: "readPdfFile",
        args: { path: "/tmp/test.pdf" },
      }

      const executor = new McpToolExecutor()
      const result = await executor.execute(toolCall, skillManagers)

      expect(result.id).toBe("call-1")
      expect(result.result).toHaveLength(1)
      // File doesn't exist so it falls back to error message
      expect(result.result[0].type).toBe("textPart")
    })

    it("handles non-textPart results unchanged", async () => {
      const { getSkillManagerByToolName } = await import("../skill-manager/helpers.js")
      const callToolFn = vi
        .fn()
        .mockResolvedValue([{ type: "imagePart", id: "img-1", data: "base64data" }])
      const mcpManager = createMockSkillManager("mcp", callToolFn)
      vi.mocked(getSkillManagerByToolName).mockResolvedValue(mcpManager)

      const skillManagers: Record<string, BaseSkillManager> = {}
      const toolCall: ToolCall = {
        id: "call-1",
        skillName: "files",
        toolName: "readImageFile",
        args: { path: "/tmp/test.png" },
      }

      const executor = new McpToolExecutor()
      const result = await executor.execute(toolCall, skillManagers)

      expect(result.result).toHaveLength(1)
      expect(result.result[0].type).toBe("imagePart")
    })

    it("handles non-JSON text parts for file tools", async () => {
      const { getSkillManagerByToolName } = await import("../skill-manager/helpers.js")
      const callToolFn = vi
        .fn()
        .mockResolvedValue([{ type: "textPart", id: "part-1", text: "not valid json" }])
      const mcpManager = createMockSkillManager("mcp", callToolFn)
      vi.mocked(getSkillManagerByToolName).mockResolvedValue(mcpManager)

      const skillManagers: Record<string, BaseSkillManager> = {}
      const toolCall: ToolCall = {
        id: "call-1",
        skillName: "files",
        toolName: "readImageFile",
        args: { path: "/tmp/test.png" },
      }

      const executor = new McpToolExecutor()
      const result = await executor.execute(toolCall, skillManagers)

      expect(result.result).toHaveLength(1)
      expect(result.result[0].type).toBe("textPart")
      expect((result.result[0] as { text: string }).text).toBe("not valid json")
    })

    it("handles JSON that is not FileInfo format", async () => {
      const { getSkillManagerByToolName } = await import("../skill-manager/helpers.js")
      const callToolFn = vi
        .fn()
        .mockResolvedValue([{ type: "textPart", id: "part-1", text: '{"foo": "bar"}' }])
      const mcpManager = createMockSkillManager("mcp", callToolFn)
      vi.mocked(getSkillManagerByToolName).mockResolvedValue(mcpManager)

      const skillManagers: Record<string, BaseSkillManager> = {}
      const toolCall: ToolCall = {
        id: "call-1",
        skillName: "files",
        toolName: "readImageFile",
        args: { path: "/tmp/test.png" },
      }

      const executor = new McpToolExecutor()
      const result = await executor.execute(toolCall, skillManagers)

      expect(result.result).toHaveLength(1)
      expect(result.result[0].type).toBe("textPart")
      expect((result.result[0] as { text: string }).text).toBe('{"foo": "bar"}')
    })
  })
})
