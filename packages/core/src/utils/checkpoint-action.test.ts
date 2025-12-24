import { describe, expect, it } from "vitest"
import type { Checkpoint, Step, ToolCall, ToolResult } from "../index.js"
import { getCheckpointAction } from "./checkpoint-action.js"

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
    args: { path: "/test.txt" },
    ...overrides,
  }
}

function createToolResult(overrides: Partial<ToolResult> = {}): ToolResult {
  return {
    id: "tr-1",
    skillName: "@perstack/base",
    toolName: "readTextFile",
    result: [{ type: "textPart", id: "tp-1", text: '{"content": "file content"}' }],
    ...overrides,
  }
}

describe("getCheckpointAction", () => {
  describe("delegate action", () => {
    it("returns delegate action when status is stoppedByDelegate", () => {
      const checkpoint = createBaseCheckpoint({
        status: "stoppedByDelegate",
        delegateTo: [
          {
            expert: { key: "child@1.0.0", name: "child", version: "1.0.0" },
            toolCallId: "tc-1",
            toolName: "delegateToChild",
            query: "do something",
          },
        ],
      })
      const step = createBaseStep()

      const action = getCheckpointAction({ checkpoint, step })

      expect(action).toEqual({
        type: "delegate",
        delegateTo: [{ expertKey: "child@1.0.0", query: "do something" }],
      })
    })
  })

  describe("interactive tool action", () => {
    it("returns interactiveTool action when status is stoppedByInteractiveTool", () => {
      const checkpoint = createBaseCheckpoint({
        status: "stoppedByInteractiveTool",
      })
      const step = createBaseStep({
        toolCalls: [createToolCall({ skillName: "custom-skill", toolName: "askUser" })],
      })

      const action = getCheckpointAction({ checkpoint, step })

      expect(action).toEqual({
        type: "interactiveTool",
        skillName: "custom-skill",
        toolName: "askUser",
        args: { path: "/test.txt" },
      })
    })
  })

  describe("retry action", () => {
    it("returns retry action when no tool call or result", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        newMessages: [
          {
            id: "m-1",
            type: "expertMessage",
            contents: [{ type: "textPart", id: "tp-1", text: "Something went wrong" }],
          },
        ],
      })

      const action = getCheckpointAction({ checkpoint, step })

      expect(action).toEqual({
        type: "retry",
        error: "No tool call or result found",
        message: "Something went wrong",
      })
    })
  })

  describe("base tool actions", () => {
    it("returns attemptCompletion action with no remaining todos", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        toolCalls: [createToolCall({ toolName: "attemptCompletion", args: {} })],
        toolResults: [
          createToolResult({
            toolName: "attemptCompletion",
            result: [{ type: "textPart", id: "tp-1", text: "{}" }],
          }),
        ],
      })

      const action = getCheckpointAction({ checkpoint, step })

      expect(action).toEqual({
        type: "attemptCompletion",
        remainingTodos: undefined,
        error: undefined,
      })
    })

    it("returns attemptCompletion action with remaining todos", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        toolCalls: [createToolCall({ toolName: "attemptCompletion", args: {} })],
        toolResults: [
          createToolResult({
            toolName: "attemptCompletion",
            result: [
              {
                type: "textPart",
                id: "tp-1",
                text: '{"remainingTodos": [{"id": 1, "title": "Task 1", "completed": false}]}',
              },
            ],
          }),
        ],
      })

      const action = getCheckpointAction({ checkpoint, step })

      expect(action).toEqual({
        type: "attemptCompletion",
        remainingTodos: [{ id: 1, title: "Task 1", completed: false }],
        error: undefined,
      })
    })

    it("returns todo action", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        toolCalls: [
          createToolCall({
            toolName: "todo",
            args: { newTodos: ["Task 1", "Task 2"] },
          }),
        ],
        toolResults: [
          createToolResult({
            toolName: "todo",
            result: [
              {
                type: "textPart",
                id: "tp-1",
                text: '{"todos": [{"id": 0, "title": "Task 1", "completed": false}, {"id": 1, "title": "Task 2", "completed": false}]}',
              },
            ],
          }),
        ],
      })

      const action = getCheckpointAction({ checkpoint, step })

      expect(action).toEqual({
        type: "todo",
        newTodos: ["Task 1", "Task 2"],
        completedTodos: undefined,
        todos: [
          { id: 0, title: "Task 1", completed: false },
          { id: 1, title: "Task 2", completed: false },
        ],
        error: undefined,
      })
    })

    it("returns clearTodo action", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        toolCalls: [createToolCall({ toolName: "clearTodo", args: {} })],
        toolResults: [
          createToolResult({
            toolName: "clearTodo",
            result: [{ type: "textPart", id: "tp-1", text: '{"todos": []}' }],
          }),
        ],
      })

      const action = getCheckpointAction({ checkpoint, step })

      expect(action).toEqual({
        type: "clearTodo",
        error: undefined,
      })
    })

    it("returns readTextFile action", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        toolCalls: [
          createToolCall({
            toolName: "readTextFile",
            args: { path: "/test.txt", from: 1, to: 10 },
          }),
        ],
        toolResults: [
          createToolResult({
            toolName: "readTextFile",
            result: [
              {
                type: "textPart",
                id: "tp-1",
                text: '{"path": "/test.txt", "content": "file content", "from": 1, "to": 10}',
              },
            ],
          }),
        ],
      })

      const action = getCheckpointAction({ checkpoint, step })

      expect(action).toEqual({
        type: "readTextFile",
        path: "/test.txt",
        content: "file content",
        from: 1,
        to: 10,
        error: undefined,
      })
    })

    it("returns editTextFile action", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        toolCalls: [
          createToolCall({
            toolName: "editTextFile",
            args: { path: "/test.txt", oldText: "old", newText: "new" },
          }),
        ],
        toolResults: [
          createToolResult({
            toolName: "editTextFile",
            result: [{ type: "textPart", id: "tp-1", text: '{"path": "/test.txt"}' }],
          }),
        ],
      })

      const action = getCheckpointAction({ checkpoint, step })

      expect(action).toEqual({
        type: "editTextFile",
        path: "/test.txt",
        oldText: "old",
        newText: "new",
        error: undefined,
      })
    })

    it("returns writeTextFile action", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        toolCalls: [
          createToolCall({
            toolName: "writeTextFile",
            args: { path: "/new.txt", text: "new content" },
          }),
        ],
        toolResults: [
          createToolResult({
            toolName: "writeTextFile",
            result: [{ type: "textPart", id: "tp-1", text: '{"path": "/new.txt"}' }],
          }),
        ],
      })

      const action = getCheckpointAction({ checkpoint, step })

      expect(action).toEqual({
        type: "writeTextFile",
        path: "/new.txt",
        text: "new content",
        error: undefined,
      })
    })

    it("returns appendTextFile action", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        toolCalls: [
          createToolCall({
            toolName: "appendTextFile",
            args: { path: "/log.txt", text: "log entry" },
          }),
        ],
        toolResults: [
          createToolResult({
            toolName: "appendTextFile",
            result: [{ type: "textPart", id: "tp-1", text: '{"path": "/log.txt"}' }],
          }),
        ],
      })

      const action = getCheckpointAction({ checkpoint, step })

      expect(action).toEqual({
        type: "appendTextFile",
        path: "/log.txt",
        text: "log entry",
        error: undefined,
      })
    })

    it("returns deleteFile action", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        toolCalls: [createToolCall({ toolName: "deleteFile", args: { path: "/delete.txt" } })],
        toolResults: [
          createToolResult({
            toolName: "deleteFile",
            result: [{ type: "textPart", id: "tp-1", text: '{"path": "/delete.txt"}' }],
          }),
        ],
      })

      const action = getCheckpointAction({ checkpoint, step })

      expect(action).toEqual({
        type: "deleteFile",
        path: "/delete.txt",
        error: undefined,
      })
    })

    it("returns deleteDirectory action", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        toolCalls: [
          createToolCall({
            toolName: "deleteDirectory",
            args: { path: "/old-dir", recursive: true },
          }),
        ],
        toolResults: [
          createToolResult({
            toolName: "deleteDirectory",
            result: [{ type: "textPart", id: "tp-1", text: '{"path": "/old-dir"}' }],
          }),
        ],
      })

      const action = getCheckpointAction({ checkpoint, step })

      expect(action).toEqual({
        type: "deleteDirectory",
        path: "/old-dir",
        recursive: true,
        error: undefined,
      })
    })

    it("returns moveFile action with source and destination", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        toolCalls: [
          createToolCall({
            toolName: "moveFile",
            args: { source: "/old.txt", destination: "/new.txt" },
          }),
        ],
        toolResults: [
          createToolResult({
            toolName: "moveFile",
            result: [
              {
                type: "textPart",
                id: "tp-1",
                text: '{"source": "/old.txt", "destination": "/new.txt"}',
              },
            ],
          }),
        ],
      })

      const action = getCheckpointAction({ checkpoint, step })

      expect(action).toEqual({
        type: "moveFile",
        source: "/old.txt",
        destination: "/new.txt",
        error: undefined,
      })
    })

    it("returns createDirectory action", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        toolCalls: [createToolCall({ toolName: "createDirectory", args: { path: "/new-dir" } })],
        toolResults: [
          createToolResult({
            toolName: "createDirectory",
            result: [{ type: "textPart", id: "tp-1", text: '{"path": "/new-dir"}' }],
          }),
        ],
      })

      const action = getCheckpointAction({ checkpoint, step })

      expect(action).toEqual({
        type: "createDirectory",
        path: "/new-dir",
        error: undefined,
      })
    })

    it("returns listDirectory action with items", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        toolCalls: [createToolCall({ toolName: "listDirectory", args: { path: "/src" } })],
        toolResults: [
          createToolResult({
            toolName: "listDirectory",
            result: [
              {
                type: "textPart",
                id: "tp-1",
                text: '{"path": "/src", "items": [{"name": "index.ts", "path": "index.ts", "type": "file", "size": 1024, "modified": "2024-01-01T00:00:00Z"}]}',
              },
            ],
          }),
        ],
      })

      const action = getCheckpointAction({ checkpoint, step })

      expect(action).toEqual({
        type: "listDirectory",
        path: "/src",
        items: [
          {
            name: "index.ts",
            path: "index.ts",
            type: "file",
            size: 1024,
            modified: "2024-01-01T00:00:00Z",
          },
        ],
        error: undefined,
      })
    })

    it("returns exec action", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        toolCalls: [
          createToolCall({
            toolName: "exec",
            args: {
              command: "ls",
              args: ["-la"],
              cwd: "/workspace",
              env: {},
              stdout: true,
              stderr: true,
            },
          }),
        ],
        toolResults: [
          createToolResult({
            toolName: "exec",
            result: [
              {
                type: "textPart",
                id: "tp-1",
                text: '{"output": "total 8\\ndrwxr-xr-x 2 user user 4096"}',
              },
            ],
          }),
        ],
      })

      const action = getCheckpointAction({ checkpoint, step })

      expect(action).toEqual({
        type: "exec",
        command: "ls",
        args: ["-la"],
        cwd: "/workspace",
        output: "total 8\ndrwxr-xr-x 2 user user 4096",
        error: undefined,
        stdout: undefined,
        stderr: undefined,
      })
    })
  })

  describe("general tool action", () => {
    it("returns generalTool action for non-base tools", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        toolCalls: [
          createToolCall({
            skillName: "custom-skill",
            toolName: "customTool",
            args: { foo: "bar" },
          }),
        ],
        toolResults: [
          createToolResult({
            skillName: "custom-skill",
            toolName: "customTool",
            result: [{ type: "textPart", id: "tp-1", text: "result" }],
          }),
        ],
      })

      const action = getCheckpointAction({ checkpoint, step })

      expect(action).toEqual({
        type: "generalTool",
        skillName: "custom-skill",
        toolName: "customTool",
        args: { foo: "bar" },
        result: [{ type: "textPart", id: "tp-1", text: "result" }],
        error: undefined,
      })
    })
  })

  describe("error handling", () => {
    it("captures error from JSON result", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        toolCalls: [createToolCall({ toolName: "readTextFile", args: { path: "/missing.txt" } })],
        toolResults: [
          createToolResult({
            toolName: "readTextFile",
            result: [{ type: "textPart", id: "tp-1", text: '{"error": "File not found"}' }],
          }),
        ],
      })

      const action = getCheckpointAction({ checkpoint, step })

      expect(action.type).toBe("readTextFile")
      expect((action as { error?: string }).error).toBe("File not found")
    })
  })
})
