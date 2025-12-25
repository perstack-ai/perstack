import type { PerstackEvent, RunEvent, ToolCall, ToolResult } from "@perstack/core"
import { describe, expect, it } from "vitest"
import type { LogEntry } from "../types/index.js"
import {
  createInitialLogProcessState,
  processRunEventToLog,
  toolToCheckpointAction,
} from "./event-to-log.js"

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

function createBaseEvent(overrides: Partial<RunEvent> = {}): RunEvent {
  return {
    id: "e-1",
    runId: "run-1",
    expertKey: "test-expert@1.0.0",
    jobId: "job-1",
    stepNumber: 1,
    timestamp: Date.now(),
    type: "startRun",
    ...overrides,
  } as RunEvent
}

describe("toolToCheckpointAction", () => {
  it("converts readTextFile tool to action", () => {
    const toolCall = createToolCall()
    const toolResult = createToolResult()
    const action = toolToCheckpointAction(toolCall, toolResult)
    expect(action.type).toBe("readTextFile")
    if (action.type === "readTextFile") {
      expect(action.path).toBe("/test.txt")
      expect(action.content).toBe("file content")
    }
  })

  it("converts writeTextFile tool to action", () => {
    const toolCall = createToolCall({
      toolName: "writeTextFile",
      args: { path: "/new.txt", text: "new content" },
    })
    const toolResult = createToolResult({
      toolName: "writeTextFile",
      result: [{ type: "textPart", id: "tp-1", text: "{}" }],
    })
    const action = toolToCheckpointAction(toolCall, toolResult)
    expect(action.type).toBe("writeTextFile")
    if (action.type === "writeTextFile") {
      expect(action.path).toBe("/new.txt")
      expect(action.text).toBe("new content")
    }
  })

  it("converts exec tool to action", () => {
    const toolCall = createToolCall({
      toolName: "exec",
      args: { command: "ls", args: ["-la"], cwd: "/workspace" },
    })
    const toolResult = createToolResult({
      toolName: "exec",
      result: [{ type: "textPart", id: "tp-1", text: '{"output": "file list"}' }],
    })
    const action = toolToCheckpointAction(toolCall, toolResult)
    expect(action.type).toBe("exec")
    if (action.type === "exec") {
      expect(action.command).toBe("ls")
      expect(action.args).toEqual(["-la"])
      expect(action.cwd).toBe("/workspace")
      expect(action.output).toBe("file list")
    }
  })

  it("converts general tool to action", () => {
    const toolCall = createToolCall({
      skillName: "custom-skill",
      toolName: "customTool",
      args: { foo: "bar" },
    })
    const toolResult = createToolResult({
      skillName: "custom-skill",
      toolName: "customTool",
      result: [{ type: "textPart", id: "tp-1", text: "result" }],
    })
    const action = toolToCheckpointAction(toolCall, toolResult)
    expect(action.type).toBe("generalTool")
    if (action.type === "generalTool") {
      expect(action.skillName).toBe("custom-skill")
      expect(action.toolName).toBe("customTool")
      expect(action.args).toEqual({ foo: "bar" })
    }
  })

  it("includes reasoning when provided", () => {
    const toolCall = createToolCall()
    const toolResult = createToolResult()
    const action = toolToCheckpointAction(toolCall, toolResult, "My reasoning")
    expect(action.reasoning).toBe("My reasoning")
  })
})

describe("processRunEventToLog", () => {
  it("processes completeRun event to complete action", () => {
    const state = createInitialLogProcessState()
    const logs: LogEntry[] = []
    const event = createBaseEvent({
      type: "completeRun",
      text: "Done!",
      checkpoint: {} as RunEvent["checkpoint"],
      step: {} as RunEvent["step"],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    } as Partial<RunEvent>) as RunEvent
    processRunEventToLog(state, event, (e) => logs.push(e))
    expect(logs).toHaveLength(1)
    expect(logs[0].action.type).toBe("complete")
    if (logs[0].action.type === "complete") {
      expect(logs[0].action.text).toBe("Done!")
    }
  })

  it("processes stopRunByError event to error action", () => {
    const state = createInitialLogProcessState()
    const logs: LogEntry[] = []
    const event = createBaseEvent({
      type: "stopRunByError",
      error: { name: "TestError", message: "Something failed", isRetryable: false },
      checkpoint: {} as RunEvent["checkpoint"],
      step: {} as RunEvent["step"],
    } as Partial<RunEvent>) as RunEvent
    processRunEventToLog(state, event, (e) => logs.push(e))
    expect(logs).toHaveLength(1)
    expect(logs[0].action.type).toBe("error")
    if (logs[0].action.type === "error") {
      expect(logs[0].action.errorName).toBe("TestError")
      expect(logs[0].action.error).toBe("Something failed")
    }
  })

  it("processes tool call and result events", () => {
    const state = createInitialLogProcessState()
    const logs: LogEntry[] = []
    const callEvent = createBaseEvent({
      type: "callTools",
      toolCalls: [createToolCall()],
      newMessage: {} as RunEvent["newMessage"],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    } as Partial<RunEvent>) as RunEvent
    processRunEventToLog(state, callEvent, (e) => logs.push(e))
    expect(logs).toHaveLength(0)

    const resultEvent = createBaseEvent({
      id: "e-2",
      type: "resolveToolResults",
      toolResults: [createToolResult()],
    } as Partial<RunEvent>) as RunEvent
    processRunEventToLog(state, resultEvent, (e) => logs.push(e))
    expect(logs).toHaveLength(1)
    expect(logs[0].action.type).toBe("readTextFile")
  })

  it("processes completeReasoning and includes reasoning in next action", () => {
    const state = createInitialLogProcessState()
    const logs: LogEntry[] = []

    // completeReasoning is a RuntimeEvent
    const reasoningEvent: PerstackEvent = {
      id: "e-1",
      runId: "run-1",
      jobId: "job-1",
      type: "completeReasoning",
      timestamp: Date.now(),
      text: "I should read the file",
    } as PerstackEvent
    processRunEventToLog(state, reasoningEvent, (e) => logs.push(e))
    expect(logs).toHaveLength(0)
    expect(state.completedReasoning).toBe("I should read the file")

    const callEvent = createBaseEvent({
      id: "e-2",
      type: "callTools",
      toolCalls: [createToolCall()],
      newMessage: {} as RunEvent["newMessage"],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    } as Partial<RunEvent>) as RunEvent
    processRunEventToLog(state, callEvent, (e) => logs.push(e))

    const resultEvent = createBaseEvent({
      id: "e-3",
      type: "resolveToolResults",
      toolResults: [createToolResult()],
    } as Partial<RunEvent>) as RunEvent
    processRunEventToLog(state, resultEvent, (e) => logs.push(e))
    expect(logs).toHaveLength(1)
    expect(logs[0].action.reasoning).toBe("I should read the file")
  })

  it("ignores RuntimeEvent (except completeReasoning)", () => {
    const state = createInitialLogProcessState()
    const logs: LogEntry[] = []

    // RuntimeEvent should be ignored
    const runtimeEvent: PerstackEvent = {
      id: "e-1",
      runId: "run-1",
      jobId: "job-1",
      type: "dockerBuildProgress",
      timestamp: Date.now(),
      stage: "building",
      service: "runtime",
      message: "Building image...",
    } as PerstackEvent
    processRunEventToLog(state, runtimeEvent, (e) => logs.push(e))
    expect(logs).toHaveLength(0)
  })

  it("processes retry event", () => {
    const state = createInitialLogProcessState()
    const logs: LogEntry[] = []
    const event = createBaseEvent({
      type: "retry",
      reason: "Rate limit exceeded",
      newMessages: [],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    } as Partial<RunEvent>) as RunEvent
    processRunEventToLog(state, event, (e) => logs.push(e))
    expect(logs).toHaveLength(1)
    expect(logs[0].action.type).toBe("retry")
    if (logs[0].action.type === "retry") {
      expect(logs[0].action.error).toBe("Rate limit exceeded")
    }
  })

  it("ignores events without expertKey (not RunEvent)", () => {
    const state = createInitialLogProcessState()
    const logs: LogEntry[] = []
    const event = { id: "e-1", runId: "run-1", type: "unknown" } as unknown as PerstackEvent
    processRunEventToLog(state, event, (e) => logs.push(e))
    expect(logs).toHaveLength(0)
  })

  it("processes startRun event to query action", () => {
    const state = createInitialLogProcessState()
    const logs: LogEntry[] = []
    const event = createBaseEvent({
      type: "startRun",
      initialCheckpoint: {},
      inputMessages: [
        {
          id: "m-1",
          type: "userMessage",
          contents: [{ type: "textPart", id: "tp-1", text: "Hello world" }],
        },
      ],
    } as Partial<RunEvent>) as RunEvent
    processRunEventToLog(state, event, (e) => logs.push(e))
    expect(logs).toHaveLength(1)
    expect(logs[0].action.type).toBe("query")
    if (logs[0].action.type === "query") {
      expect(logs[0].action.text).toBe("Hello world")
    }
  })

  it("only logs query once per run", () => {
    const state = createInitialLogProcessState()
    const logs: LogEntry[] = []
    const event = createBaseEvent({
      type: "startRun",
      initialCheckpoint: {},
      inputMessages: [
        {
          id: "m-1",
          type: "userMessage",
          contents: [{ type: "textPart", id: "tp-1", text: "Hello" }],
        },
      ],
    } as Partial<RunEvent>) as RunEvent
    processRunEventToLog(state, event, (e) => logs.push(e))
    processRunEventToLog(state, event, (e) => logs.push(e))
    expect(logs).toHaveLength(1)
  })

  it("resets query state after completion for new run", () => {
    const state = createInitialLogProcessState()
    const logs: LogEntry[] = []

    // First run
    const startEvent1 = createBaseEvent({
      type: "startRun",
      initialCheckpoint: {},
      inputMessages: [
        {
          id: "m-1",
          type: "userMessage",
          contents: [{ type: "textPart", id: "tp-1", text: "First query" }],
        },
      ],
    } as Partial<RunEvent>) as RunEvent
    processRunEventToLog(state, startEvent1, (e) => logs.push(e))

    const completeEvent = createBaseEvent({
      id: "e-2",
      type: "completeRun",
      text: "Done",
      checkpoint: {},
      step: {},
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    } as Partial<RunEvent>) as RunEvent
    processRunEventToLog(state, completeEvent, (e) => logs.push(e))

    // Second run
    const startEvent2 = createBaseEvent({
      id: "e-3",
      runId: "run-2",
      type: "startRun",
      initialCheckpoint: {},
      inputMessages: [
        {
          id: "m-2",
          type: "userMessage",
          contents: [{ type: "textPart", id: "tp-2", text: "Second query" }],
        },
      ],
    } as Partial<RunEvent>) as RunEvent
    processRunEventToLog(state, startEvent2, (e) => logs.push(e))

    expect(logs).toHaveLength(3)
    expect(logs[0].action.type).toBe("query")
    expect(logs[1].action.type).toBe("complete")
    expect(logs[2].action.type).toBe("query")
    if (logs[2].action.type === "query") {
      expect(logs[2].action.text).toBe("Second query")
    }
  })

  it("processes callInteractiveTool event", () => {
    const state = createInitialLogProcessState()
    const logs: LogEntry[] = []

    const toolCall = createToolCall({ id: "interactive-1", toolName: "askUser" })
    const callEvent = createBaseEvent({
      type: "callInteractiveTool",
      toolCall,
    } as Partial<RunEvent>) as RunEvent
    processRunEventToLog(state, callEvent, (e) => logs.push(e))
    expect(logs).toHaveLength(0)
    expect(state.tools.has("interactive-1")).toBe(true)
  })

  it("processes callDelegate event", () => {
    const state = createInitialLogProcessState()
    const logs: LogEntry[] = []

    const toolCall = createToolCall({ id: "delegate-1", toolName: "delegate" })
    const callEvent = createBaseEvent({
      type: "callDelegate",
      toolCall,
    } as Partial<RunEvent>) as RunEvent
    processRunEventToLog(state, callEvent, (e) => logs.push(e))
    expect(logs).toHaveLength(0)
    expect(state.tools.has("delegate-1")).toBe(true)
  })

  it("processes attemptCompletion event with single toolResult", () => {
    const state = createInitialLogProcessState()
    const logs: LogEntry[] = []

    // First add tool call
    const toolCall = createToolCall({ id: "attempt-1", toolName: "attemptCompletion" })
    const callEvent = createBaseEvent({
      type: "callTools",
      toolCalls: [toolCall],
      newMessage: {} as RunEvent["newMessage"],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    } as Partial<RunEvent>) as RunEvent
    processRunEventToLog(state, callEvent, (e) => logs.push(e))

    // Then resolve with attemptCompletion event (single toolResult)
    const toolResult = createToolResult({
      id: "attempt-1",
      toolName: "attemptCompletion",
      result: [{ type: "textPart", id: "tp-1", text: "{}" }],
    })
    const resultEvent = createBaseEvent({
      id: "e-2",
      type: "attemptCompletion",
      toolResult,
    } as Partial<RunEvent>) as RunEvent
    processRunEventToLog(state, resultEvent, (e) => logs.push(e))

    expect(logs).toHaveLength(1)
    expect(logs[0].action.type).toBe("attemptCompletion")
  })

  it("does not log query when startRun has no user message", () => {
    const state = createInitialLogProcessState()
    const logs: LogEntry[] = []
    const event = createBaseEvent({
      type: "startRun",
      initialCheckpoint: {},
      inputMessages: [{ id: "m-1", type: "systemMessage", contents: [] }],
    } as Partial<RunEvent>) as RunEvent
    processRunEventToLog(state, event, (e) => logs.push(e))
    expect(logs).toHaveLength(0)
  })

  it("does not log query when user message has no text content", () => {
    const state = createInitialLogProcessState()
    const logs: LogEntry[] = []
    const event = createBaseEvent({
      type: "startRun",
      initialCheckpoint: {},
      inputMessages: [
        { id: "m-1", type: "userMessage", contents: [{ type: "imagePart", id: "ip-1" }] },
      ],
    } as Partial<RunEvent>) as RunEvent
    processRunEventToLog(state, event, (e) => logs.push(e))
    expect(logs).toHaveLength(0)
  })

  it("does not duplicate tool log when already logged", () => {
    const state = createInitialLogProcessState()
    const logs: LogEntry[] = []

    const toolCall = createToolCall()
    const callEvent = createBaseEvent({
      type: "callTools",
      toolCalls: [toolCall],
      newMessage: {} as RunEvent["newMessage"],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    } as Partial<RunEvent>) as RunEvent
    processRunEventToLog(state, callEvent, (e) => logs.push(e))

    const resultEvent = createBaseEvent({
      id: "e-2",
      type: "resolveToolResults",
      toolResults: [createToolResult()],
    } as Partial<RunEvent>) as RunEvent
    processRunEventToLog(state, resultEvent, (e) => logs.push(e))
    // Try to log same result again
    processRunEventToLog(state, resultEvent, (e) => logs.push(e))

    expect(logs).toHaveLength(1)
  })

  it("clears reasoning after logging tool action", () => {
    const state = createInitialLogProcessState()
    const logs: LogEntry[] = []

    // Set reasoning
    const reasoningEvent: PerstackEvent = {
      id: "e-1",
      runId: "run-1",
      jobId: "job-1",
      type: "completeReasoning",
      timestamp: Date.now(),
      text: "My reasoning",
    } as PerstackEvent
    processRunEventToLog(state, reasoningEvent, (e) => logs.push(e))
    expect(state.completedReasoning).toBe("My reasoning")

    // Tool call and result
    const callEvent = createBaseEvent({
      id: "e-2",
      type: "callTools",
      toolCalls: [createToolCall()],
      newMessage: {} as RunEvent["newMessage"],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    } as Partial<RunEvent>) as RunEvent
    processRunEventToLog(state, callEvent, (e) => logs.push(e))

    const resultEvent = createBaseEvent({
      id: "e-3",
      type: "resolveToolResults",
      toolResults: [createToolResult()],
    } as Partial<RunEvent>) as RunEvent
    processRunEventToLog(state, resultEvent, (e) => logs.push(e))

    // Reasoning should be cleared
    expect(state.completedReasoning).toBeUndefined()
  })

  it("logs new query when resuming incomplete checkpoint with different runId", () => {
    const state = createInitialLogProcessState()
    const logs: LogEntry[] = []

    // First run (incomplete - no completeRun)
    const startEvent1 = createBaseEvent({
      type: "startRun",
      runId: "run-1",
      initialCheckpoint: {},
      inputMessages: [
        {
          id: "m-1",
          type: "userMessage",
          contents: [{ type: "textPart", id: "tp-1", text: "First query" }],
        },
      ],
    } as Partial<RunEvent>) as RunEvent
    processRunEventToLog(state, startEvent1, (e) => logs.push(e))
    expect(logs).toHaveLength(1)
    expect(state.queryLogged).toBe(true)
    expect(state.completionLogged).toBe(false)

    // New run with different runId (resuming from incomplete checkpoint)
    const startEvent2 = createBaseEvent({
      id: "e-2",
      runId: "run-2",
      type: "startRun",
      initialCheckpoint: {},
      inputMessages: [
        {
          id: "m-2",
          type: "userMessage",
          contents: [{ type: "textPart", id: "tp-2", text: "Second query" }],
        },
      ],
    } as Partial<RunEvent>) as RunEvent
    processRunEventToLog(state, startEvent2, (e) => logs.push(e))

    // Should have logged both queries
    expect(logs).toHaveLength(2)
    expect(logs[0].action.type).toBe("query")
    expect(logs[1].action.type).toBe("query")
    if (logs[1].action.type === "query") {
      expect(logs[1].action.text).toBe("Second query")
    }
  })

  it("clears tools map when new run starts", () => {
    const state = createInitialLogProcessState()
    const logs: LogEntry[] = []

    // First run with tool
    const startEvent1 = createBaseEvent({
      type: "startRun",
      runId: "run-1",
      initialCheckpoint: {},
      inputMessages: [
        {
          id: "m-1",
          type: "userMessage",
          contents: [{ type: "textPart", id: "tp-1", text: "First query" }],
        },
      ],
    } as Partial<RunEvent>) as RunEvent
    processRunEventToLog(state, startEvent1, (e) => logs.push(e))

    const toolCall = createToolCall({ id: "tc-1" })
    const callEvent = createBaseEvent({
      id: "e-2",
      runId: "run-1",
      type: "callTools",
      toolCalls: [toolCall],
      newMessage: {} as RunEvent["newMessage"],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    } as Partial<RunEvent>) as RunEvent
    processRunEventToLog(state, callEvent, (e) => logs.push(e))
    expect(state.tools.has("tc-1")).toBe(true)

    // New run - tools should be cleared
    const startEvent2 = createBaseEvent({
      id: "e-3",
      runId: "run-2",
      type: "startRun",
      initialCheckpoint: {},
      inputMessages: [
        {
          id: "m-2",
          type: "userMessage",
          contents: [{ type: "textPart", id: "tp-2", text: "Second query" }],
        },
      ],
    } as Partial<RunEvent>) as RunEvent
    processRunEventToLog(state, startEvent2, (e) => logs.push(e))

    // Tools map should be cleared
    expect(state.tools.size).toBe(0)
  })
})
