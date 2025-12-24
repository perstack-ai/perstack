import type { Checkpoint, Step, ToolCall, ToolResult } from "@perstack/core"
import { describe, expect, it } from "vitest"
import { toCheckpointAction } from "./checkpoint-action.js"

function createBaseCheckpoint(overrides: Partial<Checkpoint> = {}): Checkpoint {
  return {
    id: "cp-1",
    jobId: "job-1",
    runId: "run-1",
    status: "proceeding",
    stepNumber: 1,
    messages: [],
    expert: { key: "test@1.0.0", name: "test", version: "1.0.0" },
    usage: {
      inputTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      totalTokens: 0,
      cachedInputTokens: 0,
    },
    ...overrides,
  }
}

function createBaseStep(overrides: Partial<Step> = {}): Step {
  return {
    stepNumber: 1,
    newMessages: [],
    usage: {
      inputTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      totalTokens: 0,
      cachedInputTokens: 0,
    },
    startedAt: Date.now(),
    ...overrides,
  }
}

function createToolCall(overrides: Partial<ToolCall> = {}): ToolCall {
  return {
    id: "tc-1",
    skillName: "@perstack/base",
    toolName: "readTextFile",
    args: {},
    ...overrides,
  }
}

function createToolResult(
  resultData: Record<string, unknown>,
  overrides: Partial<ToolResult> = {},
): ToolResult {
  return {
    id: "tr-1",
    skillName: "@perstack/base",
    toolName: "readTextFile",
    result: [{ type: "textPart", id: "1", text: JSON.stringify(resultData) }],
    ...overrides,
  }
}

describe("toCheckpointAction", () => {
  describe("delegate action", () => {
    it("creates delegate action when status is stoppedByDelegate", () => {
      const checkpoint = createBaseCheckpoint({
        status: "stoppedByDelegate",
        delegateTo: [
          {
            expert: { key: "expert-a@1.0.0", name: "expert-a", version: "1.0.0" },
            toolCallId: "tc-1",
            toolName: "delegate",
            query: "Do task A",
          },
        ],
        messages: [
          {
            id: "m-1",
            type: "expertMessage",
            contents: [{ type: "textPart", id: "1", text: "Delegating..." }],
          },
        ],
      })
      const step = createBaseStep()

      const action = toCheckpointAction({ checkpoint, step })

      expect(action.type).toBe("delegate")
      if (action.type === "delegate") {
        expect(action.delegateTo).toHaveLength(1)
        expect(action.delegateTo[0].expertKey).toBe("expert-a@1.0.0")
        expect(action.delegateTo[0].query).toBe("Do task A")
      }
    })

    it("handles parallel delegation", () => {
      const checkpoint = createBaseCheckpoint({
        status: "stoppedByDelegate",
        delegateTo: [
          {
            expert: { key: "expert-a@1.0.0", name: "expert-a", version: "1.0.0" },
            toolCallId: "tc-1",
            toolName: "delegate",
            query: "Task A",
          },
          {
            expert: { key: "expert-b@1.0.0", name: "expert-b", version: "1.0.0" },
            toolCallId: "tc-2",
            toolName: "delegate",
            query: "Task B",
          },
        ],
        messages: [
          { id: "m-1", type: "expertMessage", contents: [{ type: "textPart", id: "1", text: "" }] },
        ],
      })
      const step = createBaseStep()

      const action = toCheckpointAction({ checkpoint, step })

      expect(action.type).toBe("delegate")
      if (action.type === "delegate") {
        expect(action.delegateTo).toHaveLength(2)
      }
    })
  })

  describe("interactive tool action", () => {
    it("creates interactiveTool action when status is stoppedByInteractiveTool", () => {
      const toolCall = createToolCall({
        skillName: "@perstack/browser",
        toolName: "askUser",
        args: { question: "What next?" },
      })
      const checkpoint = createBaseCheckpoint({ status: "stoppedByInteractiveTool" })
      const step = createBaseStep({ toolCalls: [toolCall] })

      const action = toCheckpointAction({ checkpoint, step })

      expect(action.type).toBe("interactiveTool")
      if (action.type === "interactiveTool") {
        expect(action.skillName).toBe("@perstack/browser")
        expect(action.toolName).toBe("askUser")
        expect(action.args).toEqual({ question: "What next?" })
      }
    })
  })

  describe("retry action", () => {
    it("creates retry action when no tool call/result", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        newMessages: [
          {
            id: "m-1",
            type: "expertMessage",
            contents: [
              {
                type: "textPart",
                id: "1",
                text: JSON.stringify({ error: "RateLimitError", message: "Rate limit exceeded" }),
              },
            ],
          },
        ],
      })

      const action = toCheckpointAction({ checkpoint, step })

      expect(action.type).toBe("retry")
      if (action.type === "retry") {
        expect(action.error).toBe("RateLimitError")
        expect(action.message).toBe("Rate limit exceeded")
      }
    })

    it("returns error when no new messages", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({ newMessages: [] })

      const action = toCheckpointAction({ checkpoint, step })

      expect(action.type).toBe("error")
    })
  })

  describe("attemptCompletion action", () => {
    it("creates attemptCompletion action", () => {
      const toolCall = createToolCall({ toolName: "attemptCompletion" })
      const toolResult = createToolResult({}, { toolName: "attemptCompletion" })
      const checkpoint = createBaseCheckpoint({
        messages: [
          {
            id: "m-1",
            type: "expertMessage",
            contents: [{ type: "textPart", id: "1", text: "Task completed successfully" }],
          },
        ],
      })
      const step = createBaseStep({ toolCalls: [toolCall], toolResults: [toolResult] })

      const action = toCheckpointAction({ checkpoint, step })

      expect(action.type).toBe("attemptCompletion")
      if (action.type === "attemptCompletion") {
        expect(action.result).toBe("Task completed successfully")
      }
    })
  })

  describe("think action", () => {
    it("creates think action", () => {
      const toolCall = createToolCall({
        toolName: "think",
        args: { thought: "I need to analyze this" },
      })
      const toolResult = createToolResult({}, { toolName: "think" })
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({ toolCalls: [toolCall], toolResults: [toolResult] })

      const action = toCheckpointAction({ checkpoint, step })

      expect(action.type).toBe("think")
      if (action.type === "think") {
        expect(action.thought).toBe("I need to analyze this")
      }
    })
  })

  describe("todo action", () => {
    it("creates todo action", () => {
      const toolCall = createToolCall({
        toolName: "todo",
        args: { newTodos: ["Task 1"], completedTodos: [] },
      })
      const toolResult = createToolResult(
        { todos: [{ id: 0, title: "Task 1", completed: false }] },
        { toolName: "todo" },
      )
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({ toolCalls: [toolCall], toolResults: [toolResult] })

      const action = toCheckpointAction({ checkpoint, step })

      expect(action.type).toBe("todo")
      if (action.type === "todo") {
        expect(action.newTodos).toEqual(["Task 1"])
        expect(action.todos).toHaveLength(1)
      }
    })
  })

  describe("readTextFile action", () => {
    it("creates readTextFile action", () => {
      const toolCall = createToolCall({ toolName: "readTextFile" })
      const toolResult = createToolResult(
        { path: "/file.ts", content: "export const a = 1", from: 0, to: 10 },
        { toolName: "readTextFile" },
      )
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({ toolCalls: [toolCall], toolResults: [toolResult] })

      const action = toCheckpointAction({ checkpoint, step })

      expect(action.type).toBe("readTextFile")
      if (action.type === "readTextFile") {
        expect(action.path).toBe("/file.ts")
        expect(action.content).toBe("export const a = 1")
        expect(action.from).toBe(0)
        expect(action.to).toBe(10)
      }
    })
  })

  describe("editTextFile action", () => {
    it("creates editTextFile action", () => {
      const toolCall = createToolCall({ toolName: "editTextFile" })
      const toolResult = createToolResult(
        { path: "/file.ts", oldText: "const a = 1", newText: "const a = 2" },
        { toolName: "editTextFile" },
      )
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({ toolCalls: [toolCall], toolResults: [toolResult] })

      const action = toCheckpointAction({ checkpoint, step })

      expect(action.type).toBe("editTextFile")
      if (action.type === "editTextFile") {
        expect(action.path).toBe("/file.ts")
        expect(action.oldText).toBe("const a = 1")
        expect(action.newText).toBe("const a = 2")
      }
    })
  })

  describe("writeTextFile action", () => {
    it("creates writeTextFile action", () => {
      const toolCall = createToolCall({ toolName: "writeTextFile" })
      const toolResult = createToolResult(
        { path: "/new-file.ts", text: "new content" },
        { toolName: "writeTextFile" },
      )
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({ toolCalls: [toolCall], toolResults: [toolResult] })

      const action = toCheckpointAction({ checkpoint, step })

      expect(action.type).toBe("writeTextFile")
      if (action.type === "writeTextFile") {
        expect(action.path).toBe("/new-file.ts")
        expect(action.text).toBe("new content")
      }
    })
  })

  describe("deleteFile action", () => {
    it("creates deleteFile action", () => {
      const toolCall = createToolCall({ toolName: "deleteFile" })
      const toolResult = createToolResult({ path: "/file.ts" }, { toolName: "deleteFile" })
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({ toolCalls: [toolCall], toolResults: [toolResult] })

      const action = toCheckpointAction({ checkpoint, step })

      expect(action.type).toBe("deleteFile")
      if (action.type === "deleteFile") {
        expect(action.path).toBe("/file.ts")
      }
    })
  })

  describe("moveFile action", () => {
    it("creates moveFile action", () => {
      const toolCall = createToolCall({ toolName: "moveFile" })
      const toolResult = createToolResult(
        { source: "/old.ts", destination: "/new.ts" },
        { toolName: "moveFile" },
      )
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({ toolCalls: [toolCall], toolResults: [toolResult] })

      const action = toCheckpointAction({ checkpoint, step })

      expect(action.type).toBe("moveFile")
      if (action.type === "moveFile") {
        expect(action.source).toBe("/old.ts")
        expect(action.destination).toBe("/new.ts")
      }
    })
  })

  describe("listDirectory action", () => {
    it("creates listDirectory action", () => {
      const toolCall = createToolCall({ toolName: "listDirectory" })
      const toolResult = createToolResult(
        {
          path: "/src",
          items: [
            {
              name: "file.ts",
              path: "/src/file.ts",
              type: "file",
              size: 100,
              modified: "2024-01-01",
            },
          ],
        },
        { toolName: "listDirectory" },
      )
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({ toolCalls: [toolCall], toolResults: [toolResult] })

      const action = toCheckpointAction({ checkpoint, step })

      expect(action.type).toBe("listDirectory")
      if (action.type === "listDirectory") {
        expect(action.path).toBe("/src")
        expect(action.items).toHaveLength(1)
      }
    })
  })

  describe("createDirectory action", () => {
    it("creates createDirectory action", () => {
      const toolCall = createToolCall({ toolName: "createDirectory" })
      const toolResult = createToolResult({ path: "/new-dir" }, { toolName: "createDirectory" })
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({ toolCalls: [toolCall], toolResults: [toolResult] })

      const action = toCheckpointAction({ checkpoint, step })

      expect(action.type).toBe("createDirectory")
      if (action.type === "createDirectory") {
        expect(action.path).toBe("/new-dir")
      }
    })
  })

  describe("getFileInfo action", () => {
    it("creates getFileInfo action", () => {
      const toolCall = createToolCall({ toolName: "getFileInfo" })
      const toolResult = createToolResult(
        {
          path: "/file.ts",
          exists: true,
          absolutePath: "/full/path/file.ts",
          name: "file.ts",
          directory: "/full/path",
          extension: ".ts",
          mimeType: "text/typescript",
          size: 1024,
          sizeFormatted: "1 KB",
          created: "2024-01-01T00:00:00Z",
          modified: "2024-01-02T00:00:00Z",
          accessed: "2024-01-03T00:00:00Z",
          permissions: { readable: true, writable: true, executable: false },
        },
        { toolName: "getFileInfo" },
      )
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({ toolCalls: [toolCall], toolResults: [toolResult] })

      const action = toCheckpointAction({ checkpoint, step })

      expect(action.type).toBe("getFileInfo")
      if (action.type === "getFileInfo") {
        expect(action.exists).toBe(true)
        expect(action.size).toBe(1024)
        expect(action.permissions.readable).toBe(true)
      }
    })
  })

  describe("appendTextFile action", () => {
    it("creates appendTextFile action", () => {
      const toolCall = createToolCall({ toolName: "appendTextFile" })
      const toolResult = createToolResult(
        { path: "/file.txt", text: "appended content" },
        { toolName: "appendTextFile" },
      )
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({ toolCalls: [toolCall], toolResults: [toolResult] })

      const action = toCheckpointAction({ checkpoint, step })

      expect(action.type).toBe("appendTextFile")
      if (action.type === "appendTextFile") {
        expect(action.path).toBe("/file.txt")
        expect(action.text).toBe("appended content")
      }
    })
  })

  describe("readImageFile action", () => {
    it("creates readImageFile action", () => {
      const toolCall = createToolCall({ toolName: "readImageFile" })
      const toolResult = createToolResult(
        { path: "/image.png", mimeType: "image/png", size: 2048 },
        { toolName: "readImageFile" },
      )
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({ toolCalls: [toolCall], toolResults: [toolResult] })

      const action = toCheckpointAction({ checkpoint, step })

      expect(action.type).toBe("readImageFile")
      if (action.type === "readImageFile") {
        expect(action.path).toBe("/image.png")
        expect(action.mimeType).toBe("image/png")
      }
    })
  })

  describe("readPdfFile action", () => {
    it("creates readPdfFile action", () => {
      const toolCall = createToolCall({ toolName: "readPdfFile" })
      const toolResult = createToolResult(
        { path: "/doc.pdf", mimeType: "application/pdf", size: 4096 },
        { toolName: "readPdfFile" },
      )
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({ toolCalls: [toolCall], toolResults: [toolResult] })

      const action = toCheckpointAction({ checkpoint, step })

      expect(action.type).toBe("readPdfFile")
      if (action.type === "readPdfFile") {
        expect(action.path).toBe("/doc.pdf")
      }
    })
  })

  describe("testUrl action", () => {
    it("creates testUrl action", () => {
      const toolCall = createToolCall({ toolName: "testUrl" })
      const toolResult = createToolResult(
        {
          results: [
            { url: "https://example.com", status: 200, title: "Example", description: "Test" },
          ],
        },
        { toolName: "testUrl" },
      )
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({ toolCalls: [toolCall], toolResults: [toolResult] })

      const action = toCheckpointAction({ checkpoint, step })

      expect(action.type).toBe("testUrl")
      if (action.type === "testUrl") {
        expect(action.results).toHaveLength(1)
        expect(action.results[0].status).toBe(200)
      }
    })
  })

  describe("generalTool action", () => {
    it("creates generalTool action for unknown tools", () => {
      const toolCall = createToolCall({
        skillName: "@custom/skill",
        toolName: "customTool",
        args: { input: "test" },
      })
      const toolResult: ToolResult = {
        id: "tr-1",
        skillName: "@custom/skill",
        toolName: "customTool",
        result: [{ type: "textPart", id: "1", text: "custom result" }],
      }
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({ toolCalls: [toolCall], toolResults: [toolResult] })

      const action = toCheckpointAction({ checkpoint, step })

      expect(action.type).toBe("generalTool")
      if (action.type === "generalTool") {
        expect(action.skillName).toBe("@custom/skill")
        expect(action.toolName).toBe("customTool")
        expect(action.args).toEqual({ input: "test" })
      }
    })

    it("creates generalTool action for unknown base tools", () => {
      const toolCall = createToolCall({
        skillName: "@perstack/base",
        toolName: "unknownTool",
        args: {},
      })
      const toolResult: ToolResult = {
        id: "tr-1",
        skillName: "@perstack/base",
        toolName: "unknownTool",
        result: [{ type: "textPart", id: "1", text: "result" }],
      }
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({ toolCalls: [toolCall], toolResults: [toolResult] })

      const action = toCheckpointAction({ checkpoint, step })

      expect(action.type).toBe("generalTool")
    })
  })

  describe("error handling", () => {
    it("returns error when tool result has invalid JSON", () => {
      const toolCall = createToolCall({ toolName: "readTextFile" })
      const toolResult: ToolResult = {
        id: "tr-1",
        skillName: "@perstack/base",
        toolName: "readTextFile",
        result: [{ type: "textPart", id: "1", text: "invalid json" }],
      }
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({ toolCalls: [toolCall], toolResults: [toolResult] })

      const action = toCheckpointAction({ checkpoint, step })

      expect(action.type).toBe("error")
    })

    it("returns error when tool result has no text part", () => {
      const toolCall = createToolCall({ toolName: "readTextFile" })
      const toolResult: ToolResult = {
        id: "tr-1",
        skillName: "@perstack/base",
        toolName: "readTextFile",
        result: [],
      }
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({ toolCalls: [toolCall], toolResults: [toolResult] })

      const action = toCheckpointAction({ checkpoint, step })

      expect(action.type).toBe("error")
    })
  })
})
