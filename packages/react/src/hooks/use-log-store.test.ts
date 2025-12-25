import type { PerstackEvent, RunEvent, ToolCall, ToolResult } from "@perstack/core"
import { describe, expect, it } from "vitest"
import type { LogEntry } from "../types/index.js"
import { createInitialLogProcessState, processRunEventToLog } from "../utils/event-to-log.js"

// Since we can't use React hooks directly in Node.js tests,
// we test the core processing logic that the hook uses

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

describe("LogStore processing logic", () => {
  it("accumulates log entries from multiple events", () => {
    const state = createInitialLogProcessState()
    const logs: LogEntry[] = []
    const addEntry = (entry: LogEntry) => logs.push(entry)

    // First: tool call
    const callEvent = createBaseEvent({
      type: "callTools",
      toolCalls: [createToolCall()],
      newMessage: {} as RunEvent["newMessage"],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    } as Partial<RunEvent>) as RunEvent
    processRunEventToLog(state, callEvent, addEntry)

    // Second: tool result
    const resultEvent = createBaseEvent({
      id: "e-2",
      type: "resolveToolResults",
      toolResults: [createToolResult()],
    } as Partial<RunEvent>) as RunEvent
    processRunEventToLog(state, resultEvent, addEntry)

    // Third: complete
    const completeEvent = createBaseEvent({
      id: "e-3",
      type: "completeRun",
      text: "Task completed",
      checkpoint: {} as RunEvent["checkpoint"],
      step: {} as RunEvent["step"],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    } as Partial<RunEvent>) as RunEvent
    processRunEventToLog(state, completeEvent, addEntry)

    expect(logs).toHaveLength(2)
    expect(logs[0].action.type).toBe("readTextFile")
    expect(logs[1].action.type).toBe("complete")
  })

  it("tracks completion state", () => {
    const state = createInitialLogProcessState()
    const logs: LogEntry[] = []
    const addEntry = (entry: LogEntry) => logs.push(entry)

    expect(state.isComplete).toBe(false)

    const completeEvent = createBaseEvent({
      type: "completeRun",
      text: "Done",
      checkpoint: {} as RunEvent["checkpoint"],
      step: {} as RunEvent["step"],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    } as Partial<RunEvent>) as RunEvent
    processRunEventToLog(state, completeEvent, addEntry)

    expect(state.isComplete).toBe(true)
  })

  it("tracks completion state on error", () => {
    const state = createInitialLogProcessState()
    const logs: LogEntry[] = []
    const addEntry = (entry: LogEntry) => logs.push(entry)

    expect(state.isComplete).toBe(false)

    const errorEvent = createBaseEvent({
      type: "stopRunByError",
      error: { name: "Error", message: "Failed", isRetryable: false },
      checkpoint: {} as RunEvent["checkpoint"],
      step: {} as RunEvent["step"],
    } as Partial<RunEvent>) as RunEvent
    processRunEventToLog(state, errorEvent, addEntry)

    expect(state.isComplete).toBe(true)
    expect(logs[0].action.type).toBe("error")
  })

  it("only logs completion once", () => {
    const state = createInitialLogProcessState()
    const logs: LogEntry[] = []
    const addEntry = (entry: LogEntry) => logs.push(entry)

    const completeEvent = createBaseEvent({
      type: "completeRun",
      text: "Done",
      checkpoint: {} as RunEvent["checkpoint"],
      step: {} as RunEvent["step"],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    } as Partial<RunEvent>) as RunEvent

    processRunEventToLog(state, completeEvent, addEntry)
    processRunEventToLog(state, completeEvent, addEntry)

    expect(logs).toHaveLength(1)
  })

  it("ignores RuntimeEvent (except completeReasoning for reasoning attachment)", () => {
    const state = createInitialLogProcessState()
    const logs: LogEntry[] = []
    const addEntry = (entry: LogEntry) => logs.push(entry)

    // RuntimeEvent should be ignored
    const dockerEvent: PerstackEvent = {
      id: "e-1",
      runId: "run-1",
      jobId: "job-1",
      type: "dockerBuildProgress",
      timestamp: Date.now(),
      stage: "building",
      service: "runtime",
      message: "Building...",
    } as PerstackEvent
    processRunEventToLog(state, dockerEvent, addEntry)

    const skillEvent: PerstackEvent = {
      id: "e-2",
      runId: "run-1",
      jobId: "job-1",
      type: "skillConnected",
      timestamp: Date.now(),
      skillName: "@perstack/base",
    } as PerstackEvent
    processRunEventToLog(state, skillEvent, addEntry)

    expect(logs).toHaveLength(0)
  })

  it("attaches reasoning from completeReasoning event", () => {
    const state = createInitialLogProcessState()
    const logs: LogEntry[] = []
    const addEntry = (entry: LogEntry) => logs.push(entry)

    // completeReasoning (RuntimeEvent) should update state but not produce log
    const reasoningEvent: PerstackEvent = {
      id: "e-1",
      runId: "run-1",
      jobId: "job-1",
      type: "completeReasoning",
      timestamp: Date.now(),
      text: "Thinking about the task...",
    } as PerstackEvent
    processRunEventToLog(state, reasoningEvent, addEntry)
    expect(logs).toHaveLength(0)
    expect(state.completedReasoning).toBe("Thinking about the task...")

    // Tool call
    const callEvent = createBaseEvent({
      id: "e-2",
      type: "callTools",
      toolCalls: [createToolCall()],
      newMessage: {} as RunEvent["newMessage"],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    } as Partial<RunEvent>) as RunEvent
    processRunEventToLog(state, callEvent, addEntry)

    // Tool result should have reasoning attached
    const resultEvent = createBaseEvent({
      id: "e-3",
      type: "resolveToolResults",
      toolResults: [createToolResult()],
    } as Partial<RunEvent>) as RunEvent
    processRunEventToLog(state, resultEvent, addEntry)

    expect(logs).toHaveLength(1)
    expect(logs[0].action.reasoning).toBe("Thinking about the task...")
  })
})
