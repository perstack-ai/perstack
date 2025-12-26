import type { Activity, PerstackEvent, RunEvent, ToolCall, ToolResult } from "@perstack/core"
import {
  BASE_SKILL_PREFIX,
  createBaseToolActivity,
  createGeneralToolActivity,
} from "@perstack/core"

const TOOL_RESULT_EVENT_TYPES = new Set(["resolveToolResults", "attemptCompletion"])

/**
 * Converts a tool call and result to an Activity.
 * Delegates to core's createBaseToolActivity/createGeneralToolActivity to avoid duplication.
 */
export function toolToActivity(
  toolCall: ToolCall,
  toolResult: ToolResult,
  reasoning: string | undefined,
  meta: {
    id: string
    expertKey: string
    runId: string
    previousActivityId?: string
    delegatedBy?: { expertKey: string; runId: string }
  },
): Activity {
  const { skillName, toolName } = toolCall

  const baseActivity = skillName.startsWith(BASE_SKILL_PREFIX)
    ? createBaseToolActivity(toolName, toolCall, toolResult, reasoning)
    : createGeneralToolActivity(skillName, toolName, toolCall, toolResult, reasoning)

  // Override the base fields with the correct metadata
  return {
    ...baseActivity,
    id: meta.id,
    expertKey: meta.expertKey,
    runId: meta.runId,
    previousActivityId: meta.previousActivityId,
    delegatedBy: meta.delegatedBy,
  } as Activity
}

type ToolState = {
  id: string
  toolCall: ToolCall
  logged: boolean
}

/**
 * Per-run state to support parallel execution.
 * Each run maintains its own independent state.
 */
type RunState = {
  expertKey: string
  queryLogged: boolean
  completionLogged: boolean
  isComplete: boolean
  completedReasoning?: string
  lastActivityId?: string
  delegatedBy?: {
    expertKey: string
    runId: string
  }
  /** Track if this run has pending delegate tool calls (for delegation complete detection) */
  pendingDelegateCount: number
}

/**
 * State for processing RunEvent stream into Activity[].
 * This state tracks tool calls and their results to create complete Activity items.
 *
 * Supports the daisy chain architecture:
 * - Within-Run ordering via lastActivityId (per-run state)
 * - Cross-Run ordering via delegatedBy (per-run state)
 *
 * Note: `tools` is NOT cleared on new run to support delegation results
 * that arrive after parent expert resumes with a new runId.
 */
export type ActivityProcessState = {
  /** Tool calls indexed by toolCallId - persisted across runs for delegation handling */
  tools: Map<string, ToolState>
  /** Per-run state to support parallel execution */
  runStates: Map<string, RunState>
}

export function createInitialActivityProcessState(): ActivityProcessState {
  return {
    tools: new Map(),
    runStates: new Map(),
  }
}

function getOrCreateRunState(
  state: ActivityProcessState,
  runId: string,
  expertKey: string,
): RunState {
  let runState = state.runStates.get(runId)
  if (!runState) {
    runState = {
      expertKey,
      queryLogged: false,
      completionLogged: false,
      isComplete: false,
      pendingDelegateCount: 0,
    }
    state.runStates.set(runId, runState)
  }
  return runState
}

const isRunEvent = (event: PerstackEvent): event is RunEvent =>
  "type" in event && "expertKey" in event

const isCompleteStreamingReasoningEvent = (event: PerstackEvent): boolean =>
  "type" in event && event.type === "completeStreamingReasoning"

const isToolCallsEvent = (event: RunEvent): event is RunEvent & { toolCalls: ToolCall[] } =>
  (event.type === "callTools" || event.type === "callDelegate") && "toolCalls" in event

const isToolCallEvent = (event: RunEvent): event is RunEvent & { toolCall: ToolCall } =>
  event.type === "callInteractiveTool" && "toolCall" in event

const isToolResultsEvent = (event: RunEvent): event is RunEvent & { toolResults: ToolResult[] } =>
  event.type === "resolveToolResults" && "toolResults" in event

const isToolResultEvent = (event: RunEvent): event is RunEvent & { toolResult: ToolResult } =>
  TOOL_RESULT_EVENT_TYPES.has(event.type) && "toolResult" in event

type ToolResultPart = {
  type: "toolResultPart"
  toolCallId: string
  toolName: string
  contents: Array<{ type: string; text?: string; id?: string }>
}

type ToolMessage = {
  type: "toolMessage"
  contents: ToolResultPart[]
}

const isFinishAllToolCallsEvent = (
  event: RunEvent,
): event is RunEvent & { newMessages: ToolMessage[] } =>
  event.type === "finishAllToolCalls" && "newMessages" in event

/**
 * Processes a RunEvent and produces Activity items.
 * Only processes RunEvent (state machine transitions), not RuntimeEvent.
 *
 * @param state - Mutable processing state
 * @param event - The event to process
 * @param addActivity - Callback to add a new Activity
 */
export function processRunEventToActivity(
  state: ActivityProcessState,
  event: PerstackEvent,
  addActivity: (activity: Activity) => void,
): void {
  if (isCompleteStreamingReasoningEvent(event)) {
    const reasoningEvent = event as { text: string; runId: string; expertKey: string }
    const { runId, text, expertKey } = reasoningEvent
    const runState = state.runStates.get(runId)
    if (runState) {
      runState.completedReasoning = text
    } else {
      state.runStates.set(runId, {
        expertKey,
        queryLogged: false,
        completionLogged: false,
        isComplete: false,
        pendingDelegateCount: 0,
        completedReasoning: text,
      })
    }
    return
  }

  if (!isRunEvent(event)) {
    return
  }

  const runState = getOrCreateRunState(state, event.runId, event.expertKey)

  // Handle startRun - extract query from inputMessages and delegatedBy
  if (event.type === "startRun") {
    const startRunEvent = event as {
      inputMessages: Array<{ type: string; contents?: Array<{ type: string; text?: string }> }>
      initialCheckpoint?: {
        status?: string
        delegatedBy?: {
          expert: { key: string }
          toolCallId: string
          toolName: string
          checkpointId: string
          runId: string
        }
      }
    }
    const userMessage = startRunEvent.inputMessages.find((m) => m.type === "userMessage")
    const queryText = userMessage?.contents?.find((c) => c.type === "textPart")?.text

    // Extract delegatedBy from initialCheckpoint (only on first startRun for this runId)
    if (!runState.delegatedBy) {
      const delegatedByInfo = startRunEvent.initialCheckpoint?.delegatedBy
      if (delegatedByInfo) {
        runState.delegatedBy = {
          expertKey: delegatedByInfo.expert.key,
          runId: delegatedByInfo.runId,
        }
      }
    }

    // Check if this is a delegation return (parent expert resuming after delegation)
    // In this case, don't log the query again as it was already logged in the original run
    const isDelegationReturn =
      startRunEvent.initialCheckpoint?.status === "stoppedByDelegate" ||
      startRunEvent.initialCheckpoint?.status === "stoppedByInteractiveTool"

    if (queryText && !runState.queryLogged && !isDelegationReturn) {
      const activityId = `query-${event.runId}`
      addActivity({
        type: "query",
        id: activityId,
        expertKey: event.expertKey,
        runId: event.runId,
        previousActivityId: runState.lastActivityId,
        delegatedBy: runState.delegatedBy,
        text: queryText,
      })
      runState.lastActivityId = activityId
      runState.queryLogged = true
    }
    return
  }

  // Handle retry
  if (event.type === "retry") {
    const retryEvent = event as { reason: string }
    const activityId = `retry-${event.id}`
    addActivity({
      type: "retry",
      id: activityId,
      expertKey: event.expertKey,
      runId: event.runId,
      previousActivityId: runState.lastActivityId,
      delegatedBy: runState.delegatedBy,
      reasoning: runState.completedReasoning,
      error: retryEvent.reason,
      message: "",
    })
    runState.lastActivityId = activityId
    runState.completedReasoning = undefined
    return
  }

  // Handle completion
  if (event.type === "completeRun") {
    if (!runState.completionLogged) {
      const text = (event as { text?: string }).text ?? ""
      const activityId = `completion-${event.runId}`
      addActivity({
        type: "complete",
        id: activityId,
        expertKey: event.expertKey,
        runId: event.runId,
        previousActivityId: runState.lastActivityId,
        delegatedBy: runState.delegatedBy,
        reasoning: runState.completedReasoning,
        text,
      })
      runState.lastActivityId = activityId
      runState.completionLogged = true
      runState.isComplete = true
      runState.completedReasoning = undefined
    }
    return
  }

  // Handle error
  if (event.type === "stopRunByError") {
    const errorEvent = event as {
      error: { name: string; message: string; statusCode?: number; isRetryable?: boolean }
    }
    const activityId = `error-${event.id}`
    addActivity({
      type: "error",
      id: activityId,
      expertKey: event.expertKey,
      runId: event.runId,
      previousActivityId: runState.lastActivityId,
      delegatedBy: runState.delegatedBy,
      errorName: errorEvent.error.name,
      error: errorEvent.error.message,
      isRetryable: errorEvent.error.isRetryable,
    })
    runState.lastActivityId = activityId
    runState.isComplete = true
    runState.completedReasoning = undefined
    return
  }

  // Track tool calls
  // For callDelegate, log immediately (don't wait for result) since child runs will be displayed next
  // Note: callTools event may arrive before callDelegate for the same tool calls, so we check logged flag
  if (event.type === "callDelegate" && isToolCallsEvent(event)) {
    const reasoning = runState.completedReasoning
    // Track pending delegate count for this run
    runState.pendingDelegateCount += event.toolCalls.length
    for (const toolCall of event.toolCalls) {
      const existingTool = state.tools.get(toolCall.id)
      // Only log if not already logged (may have been registered by earlier callTools event)
      if (!existingTool || !existingTool.logged) {
        state.tools.set(toolCall.id, { id: toolCall.id, toolCall, logged: true }) // Mark as logged
        // Create a delegation action immediately using "delegate" type
        const activityId = `delegate-${toolCall.id}`
        const query = typeof toolCall.args?.query === "string" ? toolCall.args.query : ""
        addActivity({
          type: "delegate",
          id: activityId,
          expertKey: event.expertKey,
          runId: event.runId,
          previousActivityId: runState.lastActivityId,
          delegatedBy: runState.delegatedBy,
          delegateExpertKey: toolCall.skillName, // skillName is the delegate expert key
          query,
          reasoning,
        })
        runState.lastActivityId = activityId
      }
    }
    // Don't clear reasoning here - it may be needed for other tool calls in the same step
    // Reasoning will be overwritten when the next completeReasoning event arrives
  } else if (isToolCallsEvent(event)) {
    for (const toolCall of event.toolCalls) {
      if (!state.tools.has(toolCall.id)) {
        state.tools.set(toolCall.id, { id: toolCall.id, toolCall, logged: false })
      }
    }
  } else if (isToolCallEvent(event)) {
    const { toolCall } = event
    if (!state.tools.has(toolCall.id)) {
      state.tools.set(toolCall.id, { id: toolCall.id, toolCall, logged: false })
    }
  }

  // Process tool results
  if (isToolResultsEvent(event)) {
    const reasoning = runState.completedReasoning
    let anyLogged = false
    for (const toolResult of event.toolResults) {
      const tool = state.tools.get(toolResult.id)
      if (tool && !tool.logged) {
        const activityId = `action-${tool.id}`
        const activity = toolToActivity(tool.toolCall, toolResult, reasoning, {
          id: activityId,
          expertKey: event.expertKey,
          runId: event.runId,
          previousActivityId: runState.lastActivityId,
          delegatedBy: runState.delegatedBy,
        })
        addActivity(activity)
        runState.lastActivityId = activityId
        tool.logged = true
        anyLogged = true
      }
    }
    if (anyLogged) {
      runState.completedReasoning = undefined
    }
  } else if (isToolResultEvent(event)) {
    const { toolResult } = event
    const tool = state.tools.get(toolResult.id)
    if (tool && !tool.logged) {
      const activityId = `action-${tool.id}`
      const activity = toolToActivity(tool.toolCall, toolResult, runState.completedReasoning, {
        id: activityId,
        expertKey: event.expertKey,
        runId: event.runId,
        previousActivityId: runState.lastActivityId,
        delegatedBy: runState.delegatedBy,
      })
      addActivity(activity)
      runState.lastActivityId = activityId
      tool.logged = true
      runState.completedReasoning = undefined
    }
  } else if (isFinishAllToolCallsEvent(event)) {
    // Handle finishAllToolCalls - add "delegation completed" activity
    // Only emit if this run had pending delegate calls (not for regular tool calls)
    // Individual delegation calls are already logged at callDelegate time
    if (runState.pendingDelegateCount > 0) {
      const activityId = `delegation-complete-${event.id}`
      addActivity({
        type: "delegationComplete",
        id: activityId,
        expertKey: event.expertKey,
        runId: event.runId,
        previousActivityId: runState.lastActivityId,
        delegatedBy: runState.delegatedBy,
        count: runState.pendingDelegateCount,
      })
      runState.lastActivityId = activityId
      runState.pendingDelegateCount = 0 // Reset after logging
    }
  }
}
