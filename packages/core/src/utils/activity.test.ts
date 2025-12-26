import { describe, expect, it } from "vitest"
import type { Checkpoint, Step, ToolCall, ToolResult } from "../index.js"
import { getActivities } from "./activity.js"

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

describe("getActivities", () => {
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

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("readTextFile")
      expect(activities[0].reasoning).toBe("Let me analyze this...")
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

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].reasoning).toBe("First thought\n\nSecond thought")
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

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].reasoning).toBeUndefined()
    })
  })

  describe("delegate activities", () => {
    it("returns single delegate activity for single delegation", () => {
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

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("delegate")
      if (activities[0].type === "delegate") {
        expect(activities[0].delegateExpertKey).toBe("child@1.0.0")
        expect(activities[0].query).toBe("do something")
      }
    })

    it("returns multiple delegate activities for parallel delegations", () => {
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

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(2)
      expect(activities[0].type).toBe("delegate")
      expect(activities[1].type).toBe("delegate")
      if (activities[0].type === "delegate" && activities[1].type === "delegate") {
        expect(activities[0].delegateExpertKey).toBe("child-a@1.0.0")
        expect(activities[0].query).toBe("do task A")
        expect(activities[1].delegateExpertKey).toBe("child-b@1.0.0")
        expect(activities[1].query).toBe("do task B")
      }
    })
  })

  describe("interactive tool activities", () => {
    it("returns single interactiveTool activity", () => {
      const checkpoint = createBaseCheckpoint({
        status: "stoppedByInteractiveTool",
      })
      const step = createBaseStep({
        toolCalls: [createToolCall({ skillName: "custom-skill", toolName: "askUser" })],
      })

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("interactiveTool")
      if (activities[0].type === "interactiveTool") {
        expect(activities[0].skillName).toBe("custom-skill")
        expect(activities[0].toolName).toBe("askUser")
      }
    })

    it("returns multiple interactiveTool activities for parallel interactive tools", () => {
      const checkpoint = createBaseCheckpoint({
        status: "stoppedByInteractiveTool",
      })
      const step = createBaseStep({
        toolCalls: [
          createToolCall({ id: "tc-1", skillName: "custom-skill", toolName: "askUserA" }),
          createToolCall({ id: "tc-2", skillName: "custom-skill", toolName: "askUserB" }),
        ],
      })

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(2)
      expect(activities[0].type).toBe("interactiveTool")
      expect(activities[1].type).toBe("interactiveTool")
    })
  })

  describe("retry activity", () => {
    it("returns retry activity when no tool call or result", () => {
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

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("retry")
      if (activities[0].type === "retry") {
        expect(activities[0].error).toBe("No tool call or result found")
        expect(activities[0].message).toBe("Something went wrong")
      }
    })
  })

  describe("complete activity", () => {
    it("returns complete activity when status is completed", () => {
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

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("complete")
      if (activities[0].type === "complete") {
        expect(activities[0].text).toBe("Task completed successfully!")
      }
    })

    it("extracts reasoning from thinkingParts in complete activity", () => {
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

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("complete")
      expect(activities[0].reasoning).toBe("Final reasoning before completion")
      if (activities[0].type === "complete") {
        expect(activities[0].text).toBe("All done!")
      }
    })
  })

  describe("parallel tool calls", () => {
    it("returns multiple activities for parallel tool calls", () => {
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

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(2)
      expect(activities[0].type).toBe("readTextFile")
      expect(activities[1].type).toBe("readTextFile")
      if (activities[0].type === "readTextFile" && activities[1].type === "readTextFile") {
        expect(activities[0].path).toBe("/file1.txt")
        expect(activities[0].content).toBe("content 1")
        expect(activities[1].path).toBe("/file2.txt")
        expect(activities[1].content).toBe("content 2")
      }
    })

    it("returns activities only for tool calls with matching results", () => {
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

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("readTextFile")
    })

    it("shares same reasoning across all parallel activities", () => {
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

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(2)
      expect(activities[0].reasoning).toBe("Shared reasoning for both tools")
      expect(activities[1].reasoning).toBe("Shared reasoning for both tools")
    })
  })

  describe("base tool activities", () => {
    it("returns attemptCompletion activity", () => {
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

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("attemptCompletion")
    })

    it("returns todo activity", () => {
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

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("todo")
    })

    it("returns clearTodo activity", () => {
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

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("clearTodo")
    })

    it("returns readTextFile activity", () => {
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

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("readTextFile")
      if (activities[0].type === "readTextFile") {
        expect(activities[0].path).toBe("/test.txt")
        expect(activities[0].content).toBe("file content")
        expect(activities[0].from).toBe(1)
        expect(activities[0].to).toBe(10)
      }
    })

    it("returns editTextFile activity", () => {
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

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("editTextFile")
    })

    it("returns writeTextFile activity", () => {
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

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("writeTextFile")
    })

    it("returns exec activity", () => {
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

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("exec")
      if (activities[0].type === "exec") {
        expect(activities[0].command).toBe("ls")
        expect(activities[0].output).toBe("total 8\ndrwxr-xr-x 2 user user 4096")
      }
    })
  })

  describe("general tool activity", () => {
    it("returns generalTool activity for non-base tools", () => {
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

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("generalTool")
      if (activities[0].type === "generalTool") {
        expect(activities[0].skillName).toBe("custom-skill")
        expect(activities[0].toolName).toBe("customTool")
        expect(activities[0].args).toEqual({ foo: "bar" })
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

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("readTextFile")
      expect((activities[0] as { error?: string }).error).toBe("File not found")
    })

    it("avoids false positive for text containing 'error' word", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        toolCalls: [createToolCall({ toolName: "readTextFile", args: { path: "/success.txt" } })],
        toolResults: [
          createToolResult({
            toolName: "readTextFile",
            result: [
              { type: "textPart", id: "tp-1", text: "Successfully processed without error" },
            ],
          }),
        ],
      })

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("readTextFile")
      expect((activities[0] as { error?: string }).error).toBeUndefined()
    })

    it("captures error when text starts with 'Error:'", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        toolCalls: [createToolCall({ toolName: "readTextFile", args: { path: "/missing.txt" } })],
        toolResults: [
          createToolResult({
            toolName: "readTextFile",
            result: [{ type: "textPart", id: "tp-1", text: "Error: File not found" }],
          }),
        ],
      })

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect((activities[0] as { error?: string }).error).toBe("Error: File not found")
    })
  })

  describe("stoppedByError status", () => {
    it("returns error activity when status is stoppedByError", () => {
      const checkpoint = createBaseCheckpoint({
        status: "stoppedByError",
        error: {
          name: "RateLimitError",
          message: "Rate limit exceeded",
          isRetryable: true,
        },
      })
      const step = createBaseStep()

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("error")
      if (activities[0].type === "error") {
        expect(activities[0].error).toBe("Rate limit exceeded")
        expect(activities[0].errorName).toBe("RateLimitError")
        expect(activities[0].isRetryable).toBe(true)
      }
    })

    it("handles stoppedByError with missing error details", () => {
      const checkpoint = createBaseCheckpoint({
        status: "stoppedByError",
      })
      const step = createBaseStep()

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("error")
      if (activities[0].type === "error") {
        expect(activities[0].error).toBe("Unknown error")
      }
    })
  })

  describe("stoppedByDelegate with empty delegateTo", () => {
    it("returns retry activity when delegateTo is empty", () => {
      const checkpoint = createBaseCheckpoint({
        status: "stoppedByDelegate",
        delegateTo: [],
      })
      const step = createBaseStep()

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("retry")
      if (activities[0].type === "retry") {
        expect(activities[0].error).toBe("Delegate status but no delegation targets")
      }
    })

    it("returns retry activity when delegateTo is undefined", () => {
      const checkpoint = createBaseCheckpoint({
        status: "stoppedByDelegate",
        delegateTo: undefined,
      })
      const step = createBaseStep()

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("retry")
    })
  })

  describe("unknown base tool fallback", () => {
    it("uses actual skillName for unknown base tools", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        toolCalls: [
          createToolCall({
            skillName: "@perstack/base",
            toolName: "unknownTool",
            args: { foo: "bar" },
          }),
        ],
        toolResults: [
          createToolResult({
            skillName: "@perstack/base",
            toolName: "unknownTool",
            result: [{ type: "textPart", id: "tp-1", text: "result" }],
          }),
        ],
      })

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("generalTool")
      if (activities[0].type === "generalTool") {
        // Should preserve actual skillName from toolCall
        expect(activities[0].skillName).toBe("@perstack/base")
        expect(activities[0].toolName).toBe("unknownTool")
      }
    })
  })

  describe("additional base tool types", () => {
    it("returns readImageFile activity", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        toolCalls: [
          createToolCall({
            toolName: "readImageFile",
            args: { path: "/image.png" },
          }),
        ],
        toolResults: [
          createToolResult({
            toolName: "readImageFile",
            result: [
              { type: "textPart", id: "tp-1", text: '{"mimeType": "image/png", "size": 1024}' },
            ],
          }),
        ],
      })

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("readImageFile")
      if (activities[0].type === "readImageFile") {
        expect(activities[0].path).toBe("/image.png")
        expect(activities[0].mimeType).toBe("image/png")
        expect(activities[0].size).toBe(1024)
      }
    })

    it("returns readPdfFile activity", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        toolCalls: [
          createToolCall({
            toolName: "readPdfFile",
            args: { path: "/doc.pdf" },
          }),
        ],
        toolResults: [
          createToolResult({
            toolName: "readPdfFile",
            result: [
              {
                type: "textPart",
                id: "tp-1",
                text: '{"mimeType": "application/pdf", "size": 2048}',
              },
            ],
          }),
        ],
      })

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("readPdfFile")
      if (activities[0].type === "readPdfFile") {
        expect(activities[0].path).toBe("/doc.pdf")
        expect(activities[0].mimeType).toBe("application/pdf")
        expect(activities[0].size).toBe(2048)
      }
    })

    it("returns deleteDirectory activity", () => {
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
            result: [{ type: "textPart", id: "tp-1", text: "{}" }],
          }),
        ],
      })

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("deleteDirectory")
      if (activities[0].type === "deleteDirectory") {
        expect(activities[0].path).toBe("/old-dir")
        expect(activities[0].recursive).toBe(true)
      }
    })

    it("returns moveFile activity", () => {
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
            result: [{ type: "textPart", id: "tp-1", text: "{}" }],
          }),
        ],
      })

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("moveFile")
      if (activities[0].type === "moveFile") {
        expect(activities[0].source).toBe("/old.txt")
        expect(activities[0].destination).toBe("/new.txt")
      }
    })

    it("returns getFileInfo activity", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        toolCalls: [
          createToolCall({
            toolName: "getFileInfo",
            args: { path: "/test.txt" },
          }),
        ],
        toolResults: [
          createToolResult({
            toolName: "getFileInfo",
            result: [
              {
                type: "textPart",
                id: "tp-1",
                text: JSON.stringify({
                  exists: true,
                  name: "test.txt",
                  directory: "/",
                  extension: ".txt",
                  type: "file",
                  mimeType: "text/plain",
                  size: 100,
                  sizeFormatted: "100 B",
                  created: "2024-01-01",
                  modified: "2024-01-02",
                  accessed: "2024-01-03",
                }),
              },
            ],
          }),
        ],
      })

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("getFileInfo")
      if (activities[0].type === "getFileInfo") {
        expect(activities[0].path).toBe("/test.txt")
        expect(activities[0].info?.exists).toBe(true)
        expect(activities[0].info?.name).toBe("test.txt")
        expect(activities[0].info?.size).toBe(100)
      }
    })

    it("returns createDirectory activity", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        toolCalls: [
          createToolCall({
            toolName: "createDirectory",
            args: { path: "/new-dir" },
          }),
        ],
        toolResults: [
          createToolResult({
            toolName: "createDirectory",
            result: [{ type: "textPart", id: "tp-1", text: "{}" }],
          }),
        ],
      })

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("createDirectory")
      if (activities[0].type === "createDirectory") {
        expect(activities[0].path).toBe("/new-dir")
      }
    })

    it("returns listDirectory activity with items", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        toolCalls: [
          createToolCall({
            toolName: "listDirectory",
            args: { path: "/workspace" },
          }),
        ],
        toolResults: [
          createToolResult({
            toolName: "listDirectory",
            result: [
              {
                type: "textPart",
                id: "tp-1",
                text: JSON.stringify({
                  items: [
                    { name: "file1.txt", path: "/workspace/file1.txt", type: "file", size: 100 },
                    { name: "subdir", path: "/workspace/subdir", type: "directory", size: 0 },
                  ],
                }),
              },
            ],
          }),
        ],
      })

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("listDirectory")
      if (activities[0].type === "listDirectory") {
        expect(activities[0].path).toBe("/workspace")
        expect(activities[0].items).toHaveLength(2)
        expect(activities[0].items?.[0].name).toBe("file1.txt")
        expect(activities[0].items?.[1].type).toBe("directory")
      }
    })

    it("returns clearTodo activity", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        toolCalls: [
          createToolCall({
            toolName: "clearTodo",
            args: {},
          }),
        ],
        toolResults: [
          createToolResult({
            toolName: "clearTodo",
            result: [{ type: "textPart", id: "tp-1", text: "{}" }],
          }),
        ],
      })

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("clearTodo")
    })

    it("returns appendTextFile activity", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        toolCalls: [
          createToolCall({
            toolName: "appendTextFile",
            args: { path: "/log.txt", text: "new line" },
          }),
        ],
        toolResults: [
          createToolResult({
            toolName: "appendTextFile",
            result: [{ type: "textPart", id: "tp-1", text: "{}" }],
          }),
        ],
      })

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("appendTextFile")
      if (activities[0].type === "appendTextFile") {
        expect(activities[0].path).toBe("/log.txt")
        expect(activities[0].text).toBe("new line")
      }
    })

    it("returns deleteFile activity", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        toolCalls: [
          createToolCall({
            toolName: "deleteFile",
            args: { path: "/old.txt" },
          }),
        ],
        toolResults: [
          createToolResult({
            toolName: "deleteFile",
            result: [{ type: "textPart", id: "tp-1", text: "{}" }],
          }),
        ],
      })

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("deleteFile")
      if (activities[0].type === "deleteFile") {
        expect(activities[0].path).toBe("/old.txt")
      }
    })

    it("returns attemptCompletion activity with remainingTodos", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        toolCalls: [
          createToolCall({
            toolName: "attemptCompletion",
            args: {},
          }),
        ],
        toolResults: [
          createToolResult({
            toolName: "attemptCompletion",
            result: [
              {
                type: "textPart",
                id: "tp-1",
                text: JSON.stringify({
                  remainingTodos: [{ id: 1, title: "Task 1", completed: false }],
                }),
              },
            ],
          }),
        ],
      })

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("attemptCompletion")
      if (activities[0].type === "attemptCompletion") {
        expect(activities[0].remainingTodos).toHaveLength(1)
        expect(activities[0].remainingTodos?.[0].title).toBe("Task 1")
      }
    })

    it("returns todo activity with todos", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        toolCalls: [
          createToolCall({
            toolName: "todo",
            args: { newTodos: ["Task A", "Task B"], completedTodos: [0] },
          }),
        ],
        toolResults: [
          createToolResult({
            toolName: "todo",
            result: [
              {
                type: "textPart",
                id: "tp-1",
                text: JSON.stringify({
                  todos: [
                    { id: 0, title: "Task 0", completed: true },
                    { id: 1, title: "Task A", completed: false },
                    { id: 2, title: "Task B", completed: false },
                  ],
                }),
              },
            ],
          }),
        ],
      })

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("todo")
      if (activities[0].type === "todo") {
        expect(activities[0].newTodos).toEqual(["Task A", "Task B"])
        expect(activities[0].completedTodos).toEqual([0])
        expect(activities[0].todos).toHaveLength(3)
        expect(activities[0].todos[0].completed).toBe(true)
      }
    })
  })

  describe("parse function edge cases", () => {
    it("handles invalid JSON in result", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        toolCalls: [createToolCall({ toolName: "readTextFile", args: { path: "/test.txt" } })],
        toolResults: [
          createToolResult({
            toolName: "readTextFile",
            result: [{ type: "textPart", id: "tp-1", text: "invalid json" }],
          }),
        ],
      })

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("readTextFile")
      if (activities[0].type === "readTextFile") {
        expect(activities[0].content).toBeUndefined()
      }
    })

    it("handles empty result array", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        toolCalls: [createToolCall({ toolName: "readTextFile", args: { path: "/test.txt" } })],
        toolResults: [
          createToolResult({
            toolName: "readTextFile",
            result: [],
          }),
        ],
      })

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("readTextFile")
    })

    it("handles missing fields in parsed JSON", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        toolCalls: [createToolCall({ toolName: "getFileInfo", args: { path: "/test.txt" } })],
        toolResults: [
          createToolResult({
            toolName: "getFileInfo",
            result: [{ type: "textPart", id: "tp-1", text: '{"exists": false}' }],
          }),
        ],
      })

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("getFileInfo")
      if (activities[0].type === "getFileInfo") {
        expect(activities[0].info?.exists).toBe(false)
        expect(activities[0].info?.name).toBe("")
      }
    })

    it("handles invalid JSON in listDirectory result", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        toolCalls: [createToolCall({ toolName: "listDirectory", args: { path: "/test" } })],
        toolResults: [
          createToolResult({
            toolName: "listDirectory",
            result: [{ type: "textPart", id: "tp-1", text: "not json" }],
          }),
        ],
      })

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("listDirectory")
      if (activities[0].type === "listDirectory") {
        expect(activities[0].items).toBeUndefined()
      }
    })

    it("handles invalid JSON in getFileInfo result", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        toolCalls: [createToolCall({ toolName: "getFileInfo", args: { path: "/test" } })],
        toolResults: [
          createToolResult({
            toolName: "getFileInfo",
            result: [{ type: "textPart", id: "tp-1", text: "not json" }],
          }),
        ],
      })

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("getFileInfo")
      if (activities[0].type === "getFileInfo") {
        expect(activities[0].info).toBeUndefined()
      }
    })

    it("handles todos with missing id/title/completed fields", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        toolCalls: [createToolCall({ toolName: "todo", args: {} })],
        toolResults: [
          createToolResult({
            toolName: "todo",
            result: [
              {
                type: "textPart",
                id: "tp-1",
                text: JSON.stringify({ todos: [{}, { id: 5 }, { title: "Test" }] }),
              },
            ],
          }),
        ],
      })

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("todo")
      if (activities[0].type === "todo") {
        expect(activities[0].todos).toHaveLength(3)
        // First item: uses index for id, empty string for title, false for completed
        expect(activities[0].todos[0].id).toBe(0)
        expect(activities[0].todos[0].title).toBe("")
        expect(activities[0].todos[0].completed).toBe(false)
        // Second item: uses provided id
        expect(activities[0].todos[1].id).toBe(5)
        // Third item: has title
        expect(activities[0].todos[2].title).toBe("Test")
      }
    })

    it("handles remainingTodos with missing fields", () => {
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
                text: JSON.stringify({
                  remainingTodos: [
                    { id: 1, title: "Complete", completed: true },
                    {}, // missing all fields
                  ],
                }),
              },
            ],
          }),
        ],
      })

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("attemptCompletion")
      if (activities[0].type === "attemptCompletion") {
        expect(activities[0].remainingTodos).toHaveLength(2)
        expect(activities[0].remainingTodos?.[0].id).toBe(1)
        expect(activities[0].remainingTodos?.[0].completed).toBe(true)
        // Second item uses defaults
        expect(activities[0].remainingTodos?.[1].id).toBe(1) // uses index
        expect(activities[0].remainingTodos?.[1].title).toBe("")
        expect(activities[0].remainingTodos?.[1].completed).toBe(false)
      }
    })

    it("handles listDirectory items with missing/invalid fields", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        toolCalls: [createToolCall({ toolName: "listDirectory", args: { path: "/" } })],
        toolResults: [
          createToolResult({
            toolName: "listDirectory",
            result: [
              {
                type: "textPart",
                id: "tp-1",
                text: JSON.stringify({
                  items: [
                    { name: "file.txt", type: "file", size: 100 },
                    { name: "dir", type: "directory" }, // missing size
                    {}, // missing all fields
                  ],
                }),
              },
            ],
          }),
        ],
      })

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("listDirectory")
      if (activities[0].type === "listDirectory") {
        expect(activities[0].items).toHaveLength(3)
        expect(activities[0].items?.[0].size).toBe(100)
        expect(activities[0].items?.[1].type).toBe("directory")
        expect(activities[0].items?.[1].size).toBe(0) // default
        expect(activities[0].items?.[2].name).toBe("")
        expect(activities[0].items?.[2].type).toBe("file") // default
      }
    })

    it("handles todo result with non-array todos field", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        toolCalls: [createToolCall({ toolName: "todo", args: {} })],
        toolResults: [
          createToolResult({
            toolName: "todo",
            result: [{ type: "textPart", id: "tp-1", text: '{"todos": "not an array"}' }],
          }),
        ],
      })

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("todo")
      if (activities[0].type === "todo") {
        expect(activities[0].todos).toEqual([])
      }
    })

    it("handles listDirectory result with non-array items field", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        toolCalls: [createToolCall({ toolName: "listDirectory", args: { path: "/" } })],
        toolResults: [
          createToolResult({
            toolName: "listDirectory",
            result: [{ type: "textPart", id: "tp-1", text: '{"items": "not an array"}' }],
          }),
        ],
      })

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("listDirectory")
      if (activities[0].type === "listDirectory") {
        expect(activities[0].items).toBeUndefined()
      }
    })

    it("handles readImageFile with number fields", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        toolCalls: [createToolCall({ toolName: "readImageFile", args: { path: "/img.png" } })],
        toolResults: [
          createToolResult({
            toolName: "readImageFile",
            result: [
              {
                type: "textPart",
                id: "tp-1",
                text: JSON.stringify({ mimeType: "image/png", size: "not a number" }),
              },
            ],
          }),
        ],
      })

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("readImageFile")
      if (activities[0].type === "readImageFile") {
        expect(activities[0].mimeType).toBe("image/png")
        expect(activities[0].size).toBeUndefined() // not a number
      }
    })

    it("handles exec with all output fields", () => {
      const checkpoint = createBaseCheckpoint()
      const step = createBaseStep({
        toolCalls: [createToolCall({ toolName: "exec", args: { command: "echo", args: ["hi"] } })],
        toolResults: [
          createToolResult({
            toolName: "exec",
            result: [
              {
                type: "textPart",
                id: "tp-1",
                text: JSON.stringify({ output: "hi", stdout: "hi\n", stderr: "" }),
              },
            ],
          }),
        ],
      })

      const activities = getActivities({ checkpoint, step })

      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe("exec")
      if (activities[0].type === "exec") {
        expect(activities[0].output).toBe("hi")
        expect(activities[0].stdout).toBe("hi\n")
        expect(activities[0].stderr).toBe("")
      }
    })
  })
})

