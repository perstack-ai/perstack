import type { Activity, PerstackEvent, RunEvent, ToolCall, ToolResult } from "@perstack/core"
import { describe, expect, it } from "vitest"
import {
  createInitialActivityProcessState,
  processRunEventToActivity,
  toolToActivity,
} from "./event-to-activity.js"

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

describe("toolToActivity", () => {
  it("converts readTextFile tool to activity", () => {
    const toolCall = createToolCall()
    const toolResult = createToolResult()
    const activity = toolToActivity(toolCall, toolResult, undefined, {
      id: "act-1",
      expertKey: "test@1.0.0",
      runId: "run-1",
    })
    expect(activity.type).toBe("readTextFile")
    if (activity.type === "readTextFile") {
      expect(activity.path).toBe("/test.txt")
      expect(activity.content).toBe("file content")
    }
  })

  it("converts writeTextFile tool to activity", () => {
    const toolCall = createToolCall({
      toolName: "writeTextFile",
      args: { path: "/new.txt", text: "new content" },
    })
    const toolResult = createToolResult({
      toolName: "writeTextFile",
      result: [{ type: "textPart", id: "tp-1", text: "{}" }],
    })
    const activity = toolToActivity(toolCall, toolResult, undefined, {
      id: "act-1",
      expertKey: "test@1.0.0",
      runId: "run-1",
    })
    expect(activity.type).toBe("writeTextFile")
    if (activity.type === "writeTextFile") {
      expect(activity.path).toBe("/new.txt")
      expect(activity.text).toBe("new content")
    }
  })

  it("converts exec tool to activity", () => {
    const toolCall = createToolCall({
      toolName: "exec",
      args: { command: "ls", args: ["-la"], cwd: "/workspace" },
    })
    const toolResult = createToolResult({
      toolName: "exec",
      result: [{ type: "textPart", id: "tp-1", text: '{"output": "file list"}' }],
    })
    const activity = toolToActivity(toolCall, toolResult, undefined, {
      id: "act-1",
      expertKey: "test@1.0.0",
      runId: "run-1",
    })
    expect(activity.type).toBe("exec")
    if (activity.type === "exec") {
      expect(activity.command).toBe("ls")
      expect(activity.args).toEqual(["-la"])
      expect(activity.cwd).toBe("/workspace")
      expect(activity.output).toBe("file list")
    }
  })

  it("converts general tool to activity", () => {
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
    const activity = toolToActivity(toolCall, toolResult, undefined, {
      id: "act-1",
      expertKey: "test@1.0.0",
      runId: "run-1",
    })
    expect(activity.type).toBe("generalTool")
    if (activity.type === "generalTool") {
      expect(activity.skillName).toBe("custom-skill")
      expect(activity.toolName).toBe("customTool")
      expect(activity.args).toEqual({ foo: "bar" })
    }
  })

  it("includes reasoning when provided", () => {
    const toolCall = createToolCall()
    const toolResult = createToolResult()
    const activity = toolToActivity(toolCall, toolResult, "My reasoning", {
      id: "act-1",
      expertKey: "test@1.0.0",
      runId: "run-1",
    })
    expect(activity.reasoning).toBe("My reasoning")
  })
})

describe("processRunEventToActivity", () => {
  it("processes completeRun event to complete activity", () => {
    const state = createInitialActivityProcessState()
    const activities: Activity[] = []
    const event = createBaseEvent({
      type: "completeRun",
      text: "Done!",
      checkpoint: {} as RunEvent["checkpoint"],
      step: {} as RunEvent["step"],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    } as Partial<RunEvent>) as RunEvent
    processRunEventToActivity(state, event, (a) => activities.push(a))
    expect(activities).toHaveLength(1)
    expect(activities[0].type).toBe("complete")
    if (activities[0].type === "complete") {
      expect(activities[0].text).toBe("Done!")
    }
  })

  it("processes stopRunByError event to error activity", () => {
    const state = createInitialActivityProcessState()
    const activities: Activity[] = []
    const event = createBaseEvent({
      type: "stopRunByError",
      error: { name: "TestError", message: "Something failed", isRetryable: false },
      checkpoint: {} as RunEvent["checkpoint"],
      step: {} as RunEvent["step"],
    } as Partial<RunEvent>) as RunEvent
    processRunEventToActivity(state, event, (a) => activities.push(a))
    expect(activities).toHaveLength(1)
    expect(activities[0].type).toBe("error")
    if (activities[0].type === "error") {
      expect(activities[0].errorName).toBe("TestError")
      expect(activities[0].error).toBe("Something failed")
    }
  })

  it("processes tool call and result events", () => {
    const state = createInitialActivityProcessState()
    const activities: Activity[] = []
    const callEvent = createBaseEvent({
      type: "callTools",
      toolCalls: [createToolCall()],
      newMessage: {} as RunEvent["newMessage"],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    } as Partial<RunEvent>) as RunEvent
    processRunEventToActivity(state, callEvent, (a) => activities.push(a))
    expect(activities).toHaveLength(0)

    const resultEvent = createBaseEvent({
      id: "e-2",
      type: "resolveToolResults",
      toolResults: [createToolResult()],
    } as Partial<RunEvent>) as RunEvent
    processRunEventToActivity(state, resultEvent, (a) => activities.push(a))
    expect(activities).toHaveLength(1)
    expect(activities[0].type).toBe("readTextFile")
  })

  it("processes completeStreamingReasoning and includes reasoning in next activity", () => {
    const state = createInitialActivityProcessState()
    const activities: Activity[] = []

    const reasoningEvent: PerstackEvent = {
      id: "e-1",
      runId: "run-1",
      jobId: "job-1",
      expertKey: "test@1.0.0",
      stepNumber: 1,
      type: "completeStreamingReasoning",
      timestamp: Date.now(),
      text: "I should read the file",
    } as PerstackEvent
    processRunEventToActivity(state, reasoningEvent, (a) => activities.push(a))
    expect(activities).toHaveLength(0)

    const callEvent = createBaseEvent({
      id: "e-2",
      type: "callTools",
      toolCalls: [createToolCall()],
      newMessage: {} as RunEvent["newMessage"],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    } as Partial<RunEvent>) as RunEvent
    processRunEventToActivity(state, callEvent, (a) => activities.push(a))

    const resultEvent = createBaseEvent({
      id: "e-3",
      type: "resolveToolResults",
      toolResults: [createToolResult()],
    } as Partial<RunEvent>) as RunEvent
    processRunEventToActivity(state, resultEvent, (a) => activities.push(a))
    expect(activities).toHaveLength(1)
    expect(activities[0].reasoning).toBe("I should read the file")
  })

  it("ignores RuntimeEvent (except completeStreamingReasoning)", () => {
    const state = createInitialActivityProcessState()
    const activities: Activity[] = []

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
    processRunEventToActivity(state, runtimeEvent, (a) => activities.push(a))
    expect(activities).toHaveLength(0)
  })

  it("processes retry event", () => {
    const state = createInitialActivityProcessState()
    const activities: Activity[] = []
    const event = createBaseEvent({
      type: "retry",
      reason: "Rate limit exceeded",
      newMessages: [],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    } as Partial<RunEvent>) as RunEvent
    processRunEventToActivity(state, event, (a) => activities.push(a))
    expect(activities).toHaveLength(1)
    expect(activities[0].type).toBe("retry")
    if (activities[0].type === "retry") {
      expect(activities[0].error).toBe("Rate limit exceeded")
    }
  })

  it("ignores events without expertKey (not RunEvent)", () => {
    const state = createInitialActivityProcessState()
    const activities: Activity[] = []
    const event = { id: "e-1", runId: "run-1", type: "unknown" } as unknown as PerstackEvent
    processRunEventToActivity(state, event, (a) => activities.push(a))
    expect(activities).toHaveLength(0)
  })

  it("processes startRun event to query activity", () => {
    const state = createInitialActivityProcessState()
    const activities: Activity[] = []
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
    processRunEventToActivity(state, event, (a) => activities.push(a))
    expect(activities).toHaveLength(1)
    expect(activities[0].type).toBe("query")
    if (activities[0].type === "query") {
      expect(activities[0].text).toBe("Hello world")
    }
  })

  it("only logs query once per run", () => {
    const state = createInitialActivityProcessState()
    const activities: Activity[] = []
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
    processRunEventToActivity(state, event, (a) => activities.push(a))
    processRunEventToActivity(state, event, (a) => activities.push(a))
    expect(activities).toHaveLength(1)
  })

  it("resets query state after completion for new run", () => {
    const state = createInitialActivityProcessState()
    const activities: Activity[] = []

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
    processRunEventToActivity(state, startEvent1, (a) => activities.push(a))

    const completeEvent = createBaseEvent({
      id: "e-2",
      type: "completeRun",
      text: "Done",
      checkpoint: {},
      step: {},
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    } as Partial<RunEvent>) as RunEvent
    processRunEventToActivity(state, completeEvent, (a) => activities.push(a))

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
    processRunEventToActivity(state, startEvent2, (a) => activities.push(a))

    expect(activities).toHaveLength(3)
    expect(activities[0].type).toBe("query")
    expect(activities[1].type).toBe("complete")
    expect(activities[2].type).toBe("query")
    if (activities[2].type === "query") {
      expect(activities[2].text).toBe("Second query")
    }
  })

  it("processes callInteractiveTool event", () => {
    const state = createInitialActivityProcessState()
    const activities: Activity[] = []

    const toolCall = createToolCall({ id: "interactive-1", toolName: "askUser" })
    const callEvent = createBaseEvent({
      type: "callInteractiveTool",
      toolCall,
    } as Partial<RunEvent>) as RunEvent
    processRunEventToActivity(state, callEvent, (a) => activities.push(a))
    expect(activities).toHaveLength(0)
    expect(state.tools.has("interactive-1")).toBe(true)
  })

  it("processes callDelegate event with toolCalls array - logs immediately", () => {
    const state = createInitialActivityProcessState()
    const activities: Activity[] = []

    const toolCall = createToolCall({
      id: "delegate-1",
      skillName: "child-expert",
      toolName: "delegate",
      args: { query: "test query" },
    })
    const callEvent = createBaseEvent({
      type: "callDelegate",
      toolCalls: [toolCall],
    } as Partial<RunEvent>) as RunEvent
    processRunEventToActivity(state, callEvent, (a) => activities.push(a))
    // callDelegate logs immediately (unlike other tool calls that wait for results)
    expect(activities).toHaveLength(1)
    expect(activities[0].type).toBe("delegate")
    if (activities[0].type === "delegate") {
      expect(activities[0].delegateExpertKey).toBe("child-expert")
    }
    expect(state.tools.has("delegate-1")).toBe(true)
  })

  it("processes attemptCompletion event with single toolResult", () => {
    const state = createInitialActivityProcessState()
    const activities: Activity[] = []

    // First add tool call
    const toolCall = createToolCall({ id: "attempt-1", toolName: "attemptCompletion" })
    const callEvent = createBaseEvent({
      type: "callTools",
      toolCalls: [toolCall],
      newMessage: {} as RunEvent["newMessage"],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    } as Partial<RunEvent>) as RunEvent
    processRunEventToActivity(state, callEvent, (a) => activities.push(a))

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
    processRunEventToActivity(state, resultEvent, (a) => activities.push(a))

    expect(activities).toHaveLength(1)
    expect(activities[0].type).toBe("attemptCompletion")
  })

  it("does not log query when startRun has no user message", () => {
    const state = createInitialActivityProcessState()
    const activities: Activity[] = []
    const event = createBaseEvent({
      type: "startRun",
      initialCheckpoint: {},
      inputMessages: [{ id: "m-1", type: "systemMessage", contents: [] }],
    } as Partial<RunEvent>) as RunEvent
    processRunEventToActivity(state, event, (a) => activities.push(a))
    expect(activities).toHaveLength(0)
  })

  it("does not log query when user message has no text content", () => {
    const state = createInitialActivityProcessState()
    const activities: Activity[] = []
    const event = createBaseEvent({
      type: "startRun",
      initialCheckpoint: {},
      inputMessages: [
        { id: "m-1", type: "userMessage", contents: [{ type: "imagePart", id: "ip-1" }] },
      ],
    } as Partial<RunEvent>) as RunEvent
    processRunEventToActivity(state, event, (a) => activities.push(a))
    expect(activities).toHaveLength(0)
  })

  it("does not duplicate tool log when already logged", () => {
    const state = createInitialActivityProcessState()
    const activities: Activity[] = []

    const toolCall = createToolCall()
    const callEvent = createBaseEvent({
      type: "callTools",
      toolCalls: [toolCall],
      newMessage: {} as RunEvent["newMessage"],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    } as Partial<RunEvent>) as RunEvent
    processRunEventToActivity(state, callEvent, (a) => activities.push(a))

    const resultEvent = createBaseEvent({
      id: "e-2",
      type: "resolveToolResults",
      toolResults: [createToolResult()],
    } as Partial<RunEvent>) as RunEvent
    processRunEventToActivity(state, resultEvent, (a) => activities.push(a))
    // Try to log same result again
    processRunEventToActivity(state, resultEvent, (a) => activities.push(a))

    expect(activities).toHaveLength(1)
  })

  it("clears reasoning after logging tool activity", () => {
    const state = createInitialActivityProcessState()
    const activities: Activity[] = []

    // Set reasoning via completeStreamingReasoning event
    const reasoningEvent: PerstackEvent = {
      id: "e-1",
      runId: "run-1",
      jobId: "job-1",
      expertKey: "test@1.0.0",
      stepNumber: 1,
      type: "completeStreamingReasoning",
      timestamp: Date.now(),
      text: "My reasoning",
    } as PerstackEvent
    processRunEventToActivity(state, reasoningEvent, (a) => activities.push(a))

    // Tool call and result
    const callEvent = createBaseEvent({
      id: "e-2",
      type: "callTools",
      toolCalls: [createToolCall()],
      newMessage: {} as RunEvent["newMessage"],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    } as Partial<RunEvent>) as RunEvent
    processRunEventToActivity(state, callEvent, (a) => activities.push(a))

    const resultEvent = createBaseEvent({
      id: "e-3",
      type: "resolveToolResults",
      toolResults: [createToolResult()],
    } as Partial<RunEvent>) as RunEvent
    processRunEventToActivity(state, resultEvent, (a) => activities.push(a))

    // Reasoning should be cleared from the run state
    expect(state.runStates.get("run-1")?.completedReasoning).toBeUndefined()
  })

  it("correctly attributes reasoning to the right run in parallel execution", () => {
    const state = createInitialActivityProcessState()
    const activities: Activity[] = []

    // Start two runs in parallel
    const startEventA = createBaseEvent({
      type: "startRun",
      runId: "run-A",
      expertKey: "expert-A@1.0.0",
      initialCheckpoint: {},
      inputMessages: [
        {
          id: "m-1",
          type: "userMessage",
          contents: [{ type: "textPart", id: "tp-1", text: "Query A" }],
        },
      ],
    } as Partial<RunEvent>) as RunEvent
    processRunEventToActivity(state, startEventA, (a) => activities.push(a))

    const startEventB = createBaseEvent({
      id: "e-2",
      type: "startRun",
      runId: "run-B",
      expertKey: "expert-B@1.0.0",
      initialCheckpoint: {},
      inputMessages: [
        {
          id: "m-2",
          type: "userMessage",
          contents: [{ type: "textPart", id: "tp-2", text: "Query B" }],
        },
      ],
    } as Partial<RunEvent>) as RunEvent
    processRunEventToActivity(state, startEventB, (a) => activities.push(a))

    // Expert A's reasoning arrives
    const reasoningA: PerstackEvent = {
      id: "r-1",
      runId: "run-A",
      jobId: "job-1",
      expertKey: "expert-A@1.0.0",
      stepNumber: 1,
      type: "completeStreamingReasoning",
      timestamp: Date.now(),
      text: "Reasoning for A",
    } as PerstackEvent
    processRunEventToActivity(state, reasoningA, (a) => activities.push(a))

    // Expert B's reasoning arrives (should NOT overwrite A's)
    const reasoningB: PerstackEvent = {
      id: "r-2",
      runId: "run-B",
      jobId: "job-1",
      expertKey: "expert-B@1.0.0",
      stepNumber: 1,
      type: "completeStreamingReasoning",
      timestamp: Date.now(),
      text: "Reasoning for B",
    } as PerstackEvent
    processRunEventToActivity(state, reasoningB, (a) => activities.push(a))

    // Expert B completes first
    const completeB = createBaseEvent({
      id: "e-3",
      runId: "run-B",
      expertKey: "expert-B@1.0.0",
      type: "completeRun",
      text: "Result B",
      checkpoint: {},
      step: {},
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    } as Partial<RunEvent>) as RunEvent
    processRunEventToActivity(state, completeB, (a) => activities.push(a))

    // Expert A completes later
    const completeA = createBaseEvent({
      id: "e-4",
      runId: "run-A",
      expertKey: "expert-A@1.0.0",
      type: "completeRun",
      text: "Result A",
      checkpoint: {},
      step: {},
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    } as Partial<RunEvent>) as RunEvent
    processRunEventToActivity(state, completeA, (a) => activities.push(a))

    // Verify reasoning is correctly attributed
    const completionActivities = activities.filter((a) => a.type === "complete")
    expect(completionActivities).toHaveLength(2)

    const activityB = completionActivities.find((a) => a.runId === "run-B")
    const activityA = completionActivities.find((a) => a.runId === "run-A")

    expect(activityB).toBeDefined()
    expect(activityA).toBeDefined()
    if (activityB?.type === "complete") {
      expect(activityB.reasoning).toBe("Reasoning for B")
    }
    if (activityA?.type === "complete") {
      expect(activityA.reasoning).toBe("Reasoning for A")
    }
  })

  it("logs new query when resuming incomplete checkpoint with different runId", () => {
    const state = createInitialActivityProcessState()
    const activities: Activity[] = []

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
    processRunEventToActivity(state, startEvent1, (a) => activities.push(a))
    expect(activities).toHaveLength(1)

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
    processRunEventToActivity(state, startEvent2, (a) => activities.push(a))

    // Should have logged both queries
    expect(activities).toHaveLength(2)
    expect(activities[0].type).toBe("query")
    expect(activities[1].type).toBe("query")
    if (activities[1].type === "query") {
      expect(activities[1].text).toBe("Second query")
    }
  })

  it("preserves tools map across runs for delegation handling", () => {
    const state = createInitialActivityProcessState()
    const activities: Activity[] = []

    // First run with tool (e.g., delegation call)
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
    processRunEventToActivity(state, startEvent1, (a) => activities.push(a))

    const toolCall = createToolCall({ id: "tc-1" })
    const callEvent = createBaseEvent({
      id: "e-2",
      runId: "run-1",
      type: "callTools",
      toolCalls: [toolCall],
      newMessage: {} as RunEvent["newMessage"],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    } as Partial<RunEvent>) as RunEvent
    processRunEventToActivity(state, callEvent, (a) => activities.push(a))
    expect(state.tools.has("tc-1")).toBe(true)

    // New run - tools should be PRESERVED (needed for delegation results)
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
    processRunEventToActivity(state, startEvent2, (a) => activities.push(a))

    // Tools map should be preserved for delegation result handling
    expect(state.tools.has("tc-1")).toBe(true)
  })

  it("maintains daisy chain with previousActivityId within a run", () => {
    const state = createInitialActivityProcessState()
    const activities: Activity[] = []

    // Start run
    const startEvent = createBaseEvent({
      type: "startRun",
      runId: "run-1",
      initialCheckpoint: {},
      inputMessages: [
        {
          id: "m-1",
          type: "userMessage",
          contents: [{ type: "textPart", id: "tp-1", text: "Hello" }],
        },
      ],
    } as Partial<RunEvent>) as RunEvent
    processRunEventToActivity(state, startEvent, (a) => activities.push(a))

    // Tool call and result
    const toolCall = createToolCall({ id: "tc-1" })
    const callEvent = createBaseEvent({
      id: "e-2",
      runId: "run-1",
      type: "callTools",
      toolCalls: [toolCall],
      newMessage: {} as RunEvent["newMessage"],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    } as Partial<RunEvent>) as RunEvent
    processRunEventToActivity(state, callEvent, (a) => activities.push(a))

    const resultEvent = createBaseEvent({
      id: "e-3",
      runId: "run-1",
      type: "resolveToolResults",
      toolResults: [createToolResult()],
    } as Partial<RunEvent>) as RunEvent
    processRunEventToActivity(state, resultEvent, (a) => activities.push(a))

    // Verify daisy chain
    expect(activities).toHaveLength(2)
    expect(activities[0].previousActivityId).toBeUndefined() // First activity has no previous
    expect(activities[1].previousActivityId).toBe(activities[0].id) // Second activity points to first
  })

  it("extracts delegatedBy from initialCheckpoint", () => {
    const state = createInitialActivityProcessState()
    const activities: Activity[] = []

    const event = createBaseEvent({
      type: "startRun",
      runId: "child-run",
      initialCheckpoint: {
        delegatedBy: {
          expert: { key: "parent-expert@1.0.0" },
          toolCallId: "tc-1",
          toolName: "delegate",
          checkpointId: "cp-1",
          runId: "parent-run",
        },
      },
      inputMessages: [
        {
          id: "m-1",
          type: "userMessage",
          contents: [{ type: "textPart", id: "tp-1", text: "Delegated task" }],
        },
      ],
    } as Partial<RunEvent>) as RunEvent
    processRunEventToActivity(state, event, (a) => activities.push(a))

    expect(activities).toHaveLength(1)
    expect(activities[0].delegatedBy).toEqual({
      expertKey: "parent-expert@1.0.0",
      runId: "parent-run",
    })
    expect(activities[0].expertKey).toBe("test-expert@1.0.0")
    expect(activities[0].runId).toBe("child-run")
  })

  it("propagates delegatedBy to all activities in a delegated run", () => {
    const state = createInitialActivityProcessState()
    const activities: Activity[] = []

    // Start delegated run
    const startEvent = createBaseEvent({
      type: "startRun",
      runId: "child-run",
      initialCheckpoint: {
        delegatedBy: {
          expert: { key: "parent@1.0.0" },
          toolCallId: "tc-1",
          toolName: "delegate",
          checkpointId: "cp-1",
          runId: "parent-run",
        },
      },
      inputMessages: [
        {
          id: "m-1",
          type: "userMessage",
          contents: [{ type: "textPart", id: "tp-1", text: "Task" }],
        },
      ],
    } as Partial<RunEvent>) as RunEvent
    processRunEventToActivity(state, startEvent, (a) => activities.push(a))

    // Complete run
    const completeEvent = createBaseEvent({
      id: "e-2",
      runId: "child-run",
      type: "completeRun",
      text: "Done",
      checkpoint: {},
      step: {},
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    } as Partial<RunEvent>) as RunEvent
    processRunEventToActivity(state, completeEvent, (a) => activities.push(a))

    // Both activities should have delegatedBy
    expect(activities).toHaveLength(2)
    expect(activities[0].delegatedBy).toBeDefined()
    expect(activities[1].delegatedBy).toBeDefined()
    expect(activities[0].delegatedBy?.runId).toBe("parent-run")
    expect(activities[1].delegatedBy?.runId).toBe("parent-run")
  })

  it("processes finishAllToolCalls event for delegation results", () => {
    const state = createInitialActivityProcessState()
    const activities: Activity[] = []

    // First register delegate tool calls (callDelegate logs immediately)
    const delegateToolCall1 = createToolCall({
      id: "delegate-1",
      skillName: "e2e-delegate-math",
      toolName: "e2e-delegate-math",
      args: { query: "test" },
    })
    const delegateToolCall2 = createToolCall({
      id: "delegate-2",
      skillName: "e2e-delegate-text",
      toolName: "e2e-delegate-text",
      args: { query: "test" },
    })
    const callEvent = createBaseEvent({
      type: "callDelegate",
      toolCalls: [delegateToolCall1, delegateToolCall2],
    } as Partial<RunEvent>) as RunEvent
    processRunEventToActivity(state, callEvent, (a) => activities.push(a))
    // callDelegate logs immediately (2 delegate activities)
    expect(activities).toHaveLength(2)
    expect(activities[0].type).toBe("delegate")
    expect(activities[1].type).toBe("delegate")
    expect(state.tools.has("delegate-1")).toBe(true)
    expect(state.tools.has("delegate-2")).toBe(true)

    // Then process finishAllToolCalls with results in newMessages
    const finishEvent = createBaseEvent({
      id: "e-2",
      type: "finishAllToolCalls",
      newMessages: [
        {
          type: "toolMessage",
          id: "tm-1",
          contents: [
            {
              type: "toolResultPart",
              toolCallId: "delegate-1",
              toolName: "e2e-delegate-math",
              contents: [{ type: "textPart", text: "Math result: 5", id: "tp-1" }],
            },
            {
              type: "toolResultPart",
              toolCallId: "delegate-2",
              toolName: "e2e-delegate-text",
              contents: [{ type: "textPart", text: "Text result: olleh", id: "tp-2" }],
            },
          ],
        },
      ],
    } as Partial<RunEvent>) as RunEvent
    processRunEventToActivity(state, finishEvent, (a) => activities.push(a))

    // Should have added delegationComplete activity (total: 2 delegates + 1 complete = 3)
    expect(activities).toHaveLength(3)
    expect(activities[2].type).toBe("delegationComplete")
    if (activities[2].type === "delegationComplete") {
      expect(activities[2].count).toBe(2)
    }
  })
})
