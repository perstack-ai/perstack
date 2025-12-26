import {
  type Activity,
  type Checkpoint,
  createEmptyUsage,
  type PerstackEvent,
  type RunEvent,
  type Step,
  type ToolCall,
  type ToolResult,
} from "@perstack/core"
import { describe, expect, it } from "vitest"
import {
  createInitialActivityProcessState,
  processRunEventToActivity,
} from "../utils/event-to-activity.js"

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

describe("useRun processing logic", () => {
  it("accumulates activities from multiple events", () => {
    const state = createInitialActivityProcessState()
    const activities: Activity[] = []
    const addActivity = (activity: Activity) => activities.push(activity)

    const callEvent = createBaseEvent({
      type: "callTools",
      toolCalls: [createToolCall()],
      newMessage: {} as RunEvent["newMessage"],
      usage: createEmptyUsage(),
    } as Partial<RunEvent>) as RunEvent
    processRunEventToActivity(state, callEvent, addActivity)

    const resultEvent = createBaseEvent({
      id: "e-2",
      type: "resolveToolResults",
      toolResults: [createToolResult()],
    } as Partial<RunEvent>) as RunEvent
    processRunEventToActivity(state, resultEvent, addActivity)

    const completeEvent = createBaseEvent({
      id: "e-3",
      type: "completeRun",
      text: "Task completed",
      checkpoint: {} as Checkpoint,
      step: {} as Step,
      usage: createEmptyUsage(),
    } as Partial<RunEvent>) as RunEvent
    processRunEventToActivity(state, completeEvent, addActivity)

    expect(activities).toHaveLength(2)
    expect(activities[0].type).toBe("readTextFile")
    expect(activities[1].type).toBe("complete")
  })

  it("tracks completion state", () => {
    const state = createInitialActivityProcessState()
    const activities: Activity[] = []
    const addActivity = (activity: Activity) => activities.push(activity)

    const completeEvent = createBaseEvent({
      type: "completeRun",
      text: "Done",
      checkpoint: {} as Checkpoint,
      step: {} as Step,
      usage: createEmptyUsage(),
    } as Partial<RunEvent>) as RunEvent
    processRunEventToActivity(state, completeEvent, addActivity)

    expect(state.runStates.get("run-1")?.isComplete).toBe(true)
  })

  it("tracks completion state on error", () => {
    const state = createInitialActivityProcessState()
    const activities: Activity[] = []
    const addActivity = (activity: Activity) => activities.push(activity)

    const errorEvent = createBaseEvent({
      type: "stopRunByError",
      error: { name: "Error", message: "Failed", isRetryable: false },
      checkpoint: {} as Checkpoint,
      step: {} as Step,
    } as Partial<RunEvent>) as RunEvent
    processRunEventToActivity(state, errorEvent, addActivity)

    expect(state.runStates.get("run-1")?.isComplete).toBe(true)
    expect(activities[0].type).toBe("error")
  })

  it("only logs completion once", () => {
    const state = createInitialActivityProcessState()
    const activities: Activity[] = []
    const addActivity = (activity: Activity) => activities.push(activity)

    const completeEvent = createBaseEvent({
      type: "completeRun",
      text: "Done",
      checkpoint: {} as Checkpoint,
      step: {} as Step,
      usage: createEmptyUsage(),
    } as Partial<RunEvent>) as RunEvent

    processRunEventToActivity(state, completeEvent, addActivity)
    processRunEventToActivity(state, completeEvent, addActivity)

    expect(activities).toHaveLength(1)
  })

  it("ignores RuntimeEvent", () => {
    const state = createInitialActivityProcessState()
    const activities: Activity[] = []
    const addActivity = (activity: Activity) => activities.push(activity)

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
    processRunEventToActivity(state, dockerEvent, addActivity)

    const skillEvent: PerstackEvent = {
      id: "e-2",
      runId: "run-1",
      jobId: "job-1",
      type: "skillConnected",
      timestamp: Date.now(),
      skillName: "@perstack/base",
    } as PerstackEvent
    processRunEventToActivity(state, skillEvent, addActivity)

    expect(activities).toHaveLength(0)
  })

  it("attaches reasoning from completeStreamingReasoning event", () => {
    const state = createInitialActivityProcessState()
    const activities: Activity[] = []
    const addActivity = (activity: Activity) => activities.push(activity)

    const reasoningEvent: PerstackEvent = {
      id: "e-1",
      runId: "run-1",
      jobId: "job-1",
      expertKey: "test-expert@1.0.0",
      stepNumber: 1,
      type: "completeStreamingReasoning",
      timestamp: Date.now(),
      text: "Thinking about the task...",
    } as PerstackEvent
    processRunEventToActivity(state, reasoningEvent, addActivity)
    expect(activities).toHaveLength(0)

    const callEvent = createBaseEvent({
      id: "e-2",
      type: "callTools",
      toolCalls: [createToolCall()],
      newMessage: {} as RunEvent["newMessage"],
      usage: createEmptyUsage(),
    } as Partial<RunEvent>) as RunEvent
    processRunEventToActivity(state, callEvent, addActivity)

    const resultEvent = createBaseEvent({
      id: "e-3",
      type: "resolveToolResults",
      toolResults: [createToolResult()],
    } as Partial<RunEvent>) as RunEvent
    processRunEventToActivity(state, resultEvent, addActivity)

    expect(activities).toHaveLength(1)
    expect(activities[0].reasoning).toBe("Thinking about the task...")
  })
})
