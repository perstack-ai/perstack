import type {
  CheckpointAction,
  PerstackEvent,
  RunEvent,
  ToolCall,
  ToolResult,
} from "@perstack/core"
import { BASE_SKILL_PREFIX, createBaseToolAction, createGeneralToolAction } from "@perstack/core"
import type { LogEntry } from "../types/index.js"

const TOOL_RESULT_EVENT_TYPES = new Set(["resolveToolResults", "attemptCompletion"])

/**
 * Converts a tool call and result to a CheckpointAction.
 * Delegates to core's createBaseToolAction/createGeneralToolAction to avoid duplication.
 */
export function toolToCheckpointAction(
  toolCall: ToolCall,
  toolResult: ToolResult,
  reasoning?: string,
): CheckpointAction {
  const { skillName, toolName } = toolCall

  if (skillName.startsWith(BASE_SKILL_PREFIX)) {
    return createBaseToolAction(toolName, toolCall, toolResult, reasoning)
  }

  return createGeneralToolAction(skillName, toolName, toolCall, toolResult, reasoning)
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
  lastEntryId?: string
  delegatedBy?: {
    expertKey: string
    runId: string
  }
  /** Track if this run has pending delegate tool calls (for delegation complete detection) */
  pendingDelegateCount: number
}

/**
 * State for processing RunEvent stream into LogEntry[].
 * This state tracks tool calls and their results to create complete LogEntry items.
 *
 * Supports the daisy chain architecture:
 * - Within-Run ordering via lastEntryId (per-run state)
 * - Cross-Run ordering via delegatedBy (per-run state)
 *
 * Note: `tools` is NOT cleared on new run to support delegation results
 * that arrive after parent expert resumes with a new runId.
 */
export type LogProcessState = {
  /** Tool calls indexed by toolCallId - persisted across runs for delegation handling */
  tools: Map<string, ToolState>
  /** Per-run state to support parallel execution */
  runStates: Map<string, RunState>
}

export function createInitialLogProcessState(): LogProcessState {
  return {
    tools: new Map(),
    runStates: new Map(),
  }
}

function getOrCreateRunState(state: LogProcessState, runId: string, expertKey: string): RunState {
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

// completeReasoning is a RuntimeEvent but we need to track it for reasoning attachment
const isCompleteReasoningEvent = (event: PerstackEvent): boolean =>
  "type" in event && event.type === "completeReasoning"

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
 * Processes a RunEvent and produces LogEntry items.
 * Only processes RunEvent (state machine transitions), not RuntimeEvent.
 *
 * @param state - Mutable processing state
 * @param event - The event to process
 * @param addEntry - Callback to add a new LogEntry
 */
export function processRunEventToLog(
  state: LogProcessState,
  event: PerstackEvent,
  addEntry: (entry: LogEntry) => void,
): void {
  // Track reasoning from completeReasoning (RuntimeEvent) for attaching to actions
  // Note: reasoning is stored per-run in runState.completedReasoning
  if (isCompleteReasoningEvent(event)) {
    // completeReasoning doesn't have runId, so we store it for the most recent runs
    // This is a limitation - parallel runs sharing reasoning may get mixed
    // For now, we'll track in a temporary variable and attach on next run event
    ;(state as LogProcessState & { _pendingReasoning?: string })._pendingReasoning = (
      event as { text: string }
    ).text
    return
  }

  // Only process RunEvent (has expertKey) for everything else
  if (!isRunEvent(event)) {
    return
  }

  // Get or create per-run state
  const runState = getOrCreateRunState(state, event.runId, event.expertKey)

  // Transfer pending reasoning to this run's state
  const pendingReasoning = (state as LogProcessState & { _pendingReasoning?: string })
    ._pendingReasoning
  if (pendingReasoning) {
    runState.completedReasoning = pendingReasoning
    ;(state as LogProcessState & { _pendingReasoning?: string })._pendingReasoning = undefined
  }

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
      const entryId = `query-${event.runId}`
        addEntry({
        id: entryId,
          action: {
            type: "query",
            text: queryText,
          },
        expertKey: event.expertKey,
        runId: event.runId,
        previousEntryId: runState.lastEntryId,
        delegatedBy: runState.delegatedBy,
        })
      runState.lastEntryId = entryId
      runState.queryLogged = true
    }
    return
  }

  // Handle retry
  if (event.type === "retry") {
    const retryEvent = event as { reason: string }
    const entryId = `retry-${event.id}`
    addEntry({
      id: entryId,
      action: {
        type: "retry",
        reasoning: runState.completedReasoning,
        error: retryEvent.reason,
        message: "",
      },
      expertKey: event.expertKey,
      runId: event.runId,
      previousEntryId: runState.lastEntryId,
      delegatedBy: runState.delegatedBy,
    })
    runState.lastEntryId = entryId
    runState.completedReasoning = undefined
    return
  }

  // Handle completion
  if (event.type === "completeRun") {
    if (!runState.completionLogged) {
      const text = (event as { text?: string }).text ?? ""
      const entryId = `completion-${event.runId}`
      addEntry({
        id: entryId,
        action: {
          type: "complete",
          reasoning: runState.completedReasoning,
          text,
        },
        expertKey: event.expertKey,
        runId: event.runId,
        previousEntryId: runState.lastEntryId,
        delegatedBy: runState.delegatedBy,
      })
      runState.lastEntryId = entryId
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
    const entryId = `error-${event.id}`
    addEntry({
      id: entryId,
      action: {
        type: "error",
        errorName: errorEvent.error.name,
        error: errorEvent.error.message,
        isRetryable: errorEvent.error.isRetryable,
      },
      expertKey: event.expertKey,
      runId: event.runId,
      previousEntryId: runState.lastEntryId,
      delegatedBy: runState.delegatedBy,
    })
    runState.lastEntryId = entryId
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
        const entryId = `delegate-${toolCall.id}`
        const query = typeof toolCall.args?.query === "string" ? toolCall.args.query : ""
        addEntry({
          id: entryId,
          action: {
            type: "delegate",
            expertKey: toolCall.skillName, // skillName is the delegate expert key
            query,
            reasoning,
          },
          expertKey: event.expertKey,
          runId: event.runId,
          previousEntryId: runState.lastEntryId,
          delegatedBy: runState.delegatedBy,
        })
        runState.lastEntryId = entryId
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
        const action = toolToCheckpointAction(tool.toolCall, toolResult, reasoning)
        const entryId = `action-${tool.id}`
        addEntry({
          id: entryId,
          action,
          expertKey: event.expertKey,
          runId: event.runId,
          previousEntryId: runState.lastEntryId,
          delegatedBy: runState.delegatedBy,
        })
        runState.lastEntryId = entryId
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
      const action = toolToCheckpointAction(tool.toolCall, toolResult, runState.completedReasoning)
      const entryId = `action-${tool.id}`
      addEntry({
        id: entryId,
        action,
        expertKey: event.expertKey,
        runId: event.runId,
        previousEntryId: runState.lastEntryId,
        delegatedBy: runState.delegatedBy,
      })
      runState.lastEntryId = entryId
      tool.logged = true
      runState.completedReasoning = undefined
    }
  } else if (isFinishAllToolCallsEvent(event)) {
    // Handle finishAllToolCalls - add "delegation completed" log entry
    // Only emit if this run had pending delegate calls (not for regular tool calls)
    // Individual delegation calls are already logged at callDelegate time
    if (runState.pendingDelegateCount > 0) {
      const entryId = `delegation-complete-${event.id}`
      addEntry({
        id: entryId,
        action: {
          type: "delegationComplete",
          count: runState.pendingDelegateCount,
        },
        expertKey: event.expertKey,
        runId: event.runId,
        previousEntryId: runState.lastEntryId,
        delegatedBy: runState.delegatedBy,
      })
      runState.lastEntryId = entryId
      runState.pendingDelegateCount = 0 // Reset after logging
    }
  }
}
