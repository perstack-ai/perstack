import { describe, expect, it } from "vitest"
import type { Checkpoint, Step, ToolCall, ToolResult } from "../index.js"
import { getCheckpointActions } from "./checkpoint-action.js"

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
    id: "tc-1",
    skillName: "@perstack/base",
    toolName: "readTextFile",
    result: [{ type: "textPart", id: "tp-1", text: '{"content": "file content"}' }],
    ...overrides,
  }
}

describe("getCheckpointActions", () => {
  describe("reasoning extraction", () => {
    it("extracts reasoning from thinkingParts in newMessages", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        newMessages: [
          {
            id: "m-1",
            type: "expertMessage",
            contents: [
              { type: "thinkingPart", id: "tp-1", thinking: "Let me analyze this..." },
              { type: "textPart", id: "tp-2", text: "Response text" },
            ],
          },
        ],
        toolCalls: [createToolCall({ toolName: "readTextFile", args: { path: "/test.txt" } })],
        toolResults: [
          createToolResult({
            toolName: "readTextFile",
            result: [{ type: "textPart", id: "tp-1", text: '{"content": "file content"}' }],
          }),
        ],
      })

      const actions = getCheckpointActions({ checkpoint, step })

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("readTextFile")
      expect(actions[0].reasoning).toBe("Let me analyze this...")
    })

    it("combines multiple thinkingParts", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        newMessages: [
          {
            id: "m-1",
            type: "expertMessage",
            contents: [
              { type: "thinkingPart", id: "tp-1", thinking: "First thought" },
              { type: "thinkingPart", id: "tp-2", thinking: "Second thought" },
            ],
          },
        ],
        toolCalls: [createToolCall({ toolName: "readTextFile", args: { path: "/test.txt" } })],
        toolResults: [
          createToolResult({
            toolName: "readTextFile",
            result: [{ type: "textPart", id: "tp-1", text: '{"content": "file content"}' }],
          }),
        ],
      })

      const actions = getCheckpointActions({ checkpoint, step })

      expect(actions).toHaveLength(1)
      expect(actions[0].reasoning).toBe("First thought\n\nSecond thought")
    })

    it("returns undefined reasoning when no thinkingParts", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        newMessages: [
          {
            id: "m-1",
            type: "expertMessage",
            contents: [{ type: "textPart", id: "tp-1", text: "Just text" }],
          },
        ],
        toolCalls: [createToolCall({ toolName: "readTextFile", args: { path: "/test.txt" } })],
        toolResults: [
          createToolResult({
            toolName: "readTextFile",
            result: [{ type: "textPart", id: "tp-1", text: '{"content": "file content"}' }],
          }),
        ],
      })

      const actions = getCheckpointActions({ checkpoint, step })

      expect(actions).toHaveLength(1)
      expect(actions[0].reasoning).toBeUndefined()
    })
  })

  describe("delegate actions", () => {
    it("returns single delegate action for single delegation", () => {
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

      const actions = getCheckpointActions({ checkpoint, step })

      expect(actions).toHaveLength(1)
      expect(actions[0]).toEqual({
        type: "delegate",
        reasoning: undefined,
        expertKey: "child@1.0.0",
        query: "do something",
      })
    })

    it("returns multiple delegate actions for parallel delegations", () => {
      const checkpoint = createBaseCheckpoint({
        status: "stoppedByDelegate",
        delegateTo: [
          {
            expert: { key: "child-a@1.0.0", name: "child-a", version: "1.0.0" },
            toolCallId: "tc-1",
            toolName: "delegateToChildA",
            query: "do task A",
          },
          {
            expert: { key: "child-b@1.0.0", name: "child-b", version: "1.0.0" },
            toolCallId: "tc-2",
            toolName: "delegateToChildB",
            query: "do task B",
          },
        ],
      })
      const step = createBaseStep()

      const actions = getCheckpointActions({ checkpoint, step })

      expect(actions).toHaveLength(2)
      expect(actions[0]).toEqual({
        type: "delegate",
        reasoning: undefined,
        expertKey: "child-a@1.0.0",
        query: "do task A",
      })
      expect(actions[1]).toEqual({
        type: "delegate",
        reasoning: undefined,
        expertKey: "child-b@1.0.0",
        query: "do task B",
      })
    })
  })

  describe("interactive tool actions", () => {
    it("returns single interactiveTool action", () => {
      const checkpoint = createBaseCheckpoint({
        status: "stoppedByInteractiveTool",
      })
      const step = createBaseStep({
        toolCalls: [createToolCall({ skillName: "custom-skill", toolName: "askUser" })],
      })

      const actions = getCheckpointActions({ checkpoint, step })

      expect(actions).toHaveLength(1)
      expect(actions[0]).toEqual({
        type: "interactiveTool",
        reasoning: undefined,
        skillName: "custom-skill",
        toolName: "askUser",
        args: { path: "/test.txt" },
      })
    })

    it("returns multiple interactiveTool actions for parallel interactive tools", () => {
      const checkpoint = createBaseCheckpoint({
        status: "stoppedByInteractiveTool",
      })
      const step = createBaseStep({
        toolCalls: [
          createToolCall({ id: "tc-1", skillName: "custom-skill", toolName: "askUserA" }),
          createToolCall({ id: "tc-2", skillName: "custom-skill", toolName: "askUserB" }),
        ],
      })

      const actions = getCheckpointActions({ checkpoint, step })

      expect(actions).toHaveLength(2)
      expect(actions[0].type).toBe("interactiveTool")
      expect(actions[1].type).toBe("interactiveTool")
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

      const actions = getCheckpointActions({ checkpoint, step })

      expect(actions).toHaveLength(1)
      expect(actions[0]).toEqual({
        type: "retry",
        reasoning: undefined,
        error: "No tool call or result found",
        message: "Something went wrong",
      })
    })
  })

  describe("complete action", () => {
    it("returns complete action when status is completed", () => {
      const checkpoint = createBaseCheckpoint({
        status: "completed",
      })
      const step = createBaseStep({
        newMessages: [
          {
            id: "m-1",
            type: "toolMessage",
            contents: [],
          },
          {
            id: "m-2",
            type: "expertMessage",
            contents: [{ type: "textPart", id: "tp-1", text: "Task completed successfully!" }],
          },
        ],
      })

      const actions = getCheckpointActions({ checkpoint, step })

      expect(actions).toHaveLength(1)
      expect(actions[0]).toEqual({
        type: "complete",
        reasoning: undefined,
        text: "Task completed successfully!",
      })
    })

    it("extracts reasoning from thinkingParts in complete action", () => {
      const checkpoint = createBaseCheckpoint({
        status: "completed",
      })
      const step = createBaseStep({
        newMessages: [
          {
            id: "m-1",
            type: "expertMessage",
            contents: [
              { type: "thinkingPart", id: "tp-1", thinking: "Final reasoning before completion" },
              { type: "textPart", id: "tp-2", text: "All done!" },
            ],
          },
        ],
      })

      const actions = getCheckpointActions({ checkpoint, step })

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("complete")
      expect(actions[0].reasoning).toBe("Final reasoning before completion")
      if (actions[0].type === "complete") {
        expect(actions[0].text).toBe("All done!")
      }
    })
  })

  describe("parallel tool calls", () => {
    it("returns multiple actions for parallel tool calls", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        toolCalls: [
          createToolCall({ id: "tc-1", toolName: "readTextFile", args: { path: "/file1.txt" } }),
          createToolCall({ id: "tc-2", toolName: "readTextFile", args: { path: "/file2.txt" } }),
        ],
        toolResults: [
          createToolResult({
            id: "tc-1",
            toolName: "readTextFile",
            result: [{ type: "textPart", id: "tp-1", text: '{"content": "content 1"}' }],
          }),
          createToolResult({
            id: "tc-2",
            toolName: "readTextFile",
            result: [{ type: "textPart", id: "tp-2", text: '{"content": "content 2"}' }],
          }),
        ],
      })

      const actions = getCheckpointActions({ checkpoint, step })

      expect(actions).toHaveLength(2)
      expect(actions[0].type).toBe("readTextFile")
      expect(actions[1].type).toBe("readTextFile")
      if (actions[0].type === "readTextFile" && actions[1].type === "readTextFile") {
        expect(actions[0].path).toBe("/file1.txt")
        expect(actions[0].content).toBe("content 1")
        expect(actions[1].path).toBe("/file2.txt")
        expect(actions[1].content).toBe("content 2")
      }
    })

    it("returns actions only for tool calls with matching results", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        toolCalls: [
          createToolCall({ id: "tc-1", toolName: "readTextFile", args: { path: "/file1.txt" } }),
          createToolCall({ id: "tc-2", toolName: "readTextFile", args: { path: "/file2.txt" } }),
        ],
        toolResults: [
          createToolResult({
            id: "tc-1",
            toolName: "readTextFile",
            result: [{ type: "textPart", id: "tp-1", text: '{"content": "content 1"}' }],
          }),
          // tc-2 has no result yet
        ],
      })

      const actions = getCheckpointActions({ checkpoint, step })

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("readTextFile")
    })

    it("shares same reasoning across all parallel actions", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        newMessages: [
          {
            id: "m-1",
            type: "expertMessage",
            contents: [
              { type: "thinkingPart", id: "tp-1", thinking: "Shared reasoning for both tools" },
            ],
          },
        ],
        toolCalls: [
          createToolCall({ id: "tc-1", toolName: "readTextFile", args: { path: "/file1.txt" } }),
          createToolCall({ id: "tc-2", toolName: "readTextFile", args: { path: "/file2.txt" } }),
        ],
        toolResults: [
          createToolResult({
            id: "tc-1",
            toolName: "readTextFile",
            result: [{ type: "textPart", id: "tp-1", text: '{"content": "content 1"}' }],
          }),
          createToolResult({
            id: "tc-2",
            toolName: "readTextFile",
            result: [{ type: "textPart", id: "tp-2", text: '{"content": "content 2"}' }],
          }),
        ],
      })

      const actions = getCheckpointActions({ checkpoint, step })

      expect(actions).toHaveLength(2)
      expect(actions[0].reasoning).toBe("Shared reasoning for both tools")
      expect(actions[1].reasoning).toBe("Shared reasoning for both tools")
    })
  })

  describe("base tool actions", () => {
    it("returns attemptCompletion action", () => {
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

      const actions = getCheckpointActions({ checkpoint, step })

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("attemptCompletion")
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

      const actions = getCheckpointActions({ checkpoint, step })

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("todo")
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

      const actions = getCheckpointActions({ checkpoint, step })

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("clearTodo")
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

      const actions = getCheckpointActions({ checkpoint, step })

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("readTextFile")
      if (actions[0].type === "readTextFile") {
        expect(actions[0].path).toBe("/test.txt")
        expect(actions[0].content).toBe("file content")
        expect(actions[0].from).toBe(1)
        expect(actions[0].to).toBe(10)
      }
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

      const actions = getCheckpointActions({ checkpoint, step })

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("editTextFile")
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

      const actions = getCheckpointActions({ checkpoint, step })

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("writeTextFile")
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

      const actions = getCheckpointActions({ checkpoint, step })

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("exec")
      if (actions[0].type === "exec") {
        expect(actions[0].command).toBe("ls")
        expect(actions[0].output).toBe("total 8\ndrwxr-xr-x 2 user user 4096")
      }
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

      const actions = getCheckpointActions({ checkpoint, step })

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("generalTool")
      if (actions[0].type === "generalTool") {
        expect(actions[0].skillName).toBe("custom-skill")
        expect(actions[0].toolName).toBe("customTool")
        expect(actions[0].args).toEqual({ foo: "bar" })
      }
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

      const actions = getCheckpointActions({ checkpoint, step })

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("readTextFile")
      expect((actions[0] as { error?: string }).error).toBe("File not found")
    })
  })
})
