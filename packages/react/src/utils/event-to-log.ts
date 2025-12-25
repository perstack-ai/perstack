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
 * State for processing RunEvent stream into LogEntry[].
 * This state tracks tool calls and their results to create complete LogEntry items.
 */
export type LogProcessState = {
  tools: Map<string, ToolState>
  queryLogged: boolean
  completionLogged: boolean
  isComplete: boolean
  completedReasoning?: string
  currentRunId?: string
}

export function createInitialLogProcessState(): LogProcessState {
  return {
    tools: new Map(),
    queryLogged: false,
    completionLogged: false,
    isComplete: false,
  }
}

const isRunEvent = (event: PerstackEvent): event is RunEvent =>
  "type" in event && "expertKey" in event

// completeReasoning is a RuntimeEvent but we need to track it for reasoning attachment
const isCompleteReasoningEvent = (event: PerstackEvent): boolean =>
  "type" in event && event.type === "completeReasoning"

const isToolCallsEvent = (event: RunEvent): event is RunEvent & { toolCalls: ToolCall[] } =>
  event.type === "callTools" && "toolCalls" in event

const isToolCallEvent = (event: RunEvent): event is RunEvent & { toolCall: ToolCall } =>
  (event.type === "callInteractiveTool" || event.type === "callDelegate") && "toolCall" in event

const isToolResultsEvent = (event: RunEvent): event is RunEvent & { toolResults: ToolResult[] } =>
  event.type === "resolveToolResults" && "toolResults" in event

const isToolResultEvent = (event: RunEvent): event is RunEvent & { toolResult: ToolResult } =>
  TOOL_RESULT_EVENT_TYPES.has(event.type) && "toolResult" in event

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
  if (isCompleteReasoningEvent(event)) {
    state.completedReasoning = (event as { text: string }).text
    return
  }

  // Only process RunEvent (has expertKey) for everything else
  if (!isRunEvent(event)) {
    return
  }

  // Handle startRun - extract query from inputMessages
  if (event.type === "startRun") {
    const startRunEvent = event as {
      inputMessages: Array<{ type: string; contents?: Array<{ type: string; text?: string }> }>
    }
    const userMessage = startRunEvent.inputMessages.find((m) => m.type === "userMessage")
    const queryText = userMessage?.contents?.find((c) => c.type === "textPart")?.text
    if (queryText) {
      // Reset state for new run (different runId or after completion)
      const isNewRun = state.currentRunId !== event.runId
      if (isNewRun || state.completionLogged) {
        state.completionLogged = false
        state.isComplete = false
        state.queryLogged = false
        state.currentRunId = event.runId
        state.tools.clear()
      }
      if (!state.queryLogged) {
        addEntry({
          id: `query-${event.runId}`,
          action: {
            type: "query",
            text: queryText,
          },
        })
        state.queryLogged = true
      }
    }
    return
  }

  // Handle retry
  if (event.type === "retry") {
    const retryEvent = event as { reason: string }
    addEntry({
      id: `retry-${event.id}`,
      action: {
        type: "retry",
        reasoning: state.completedReasoning,
        error: retryEvent.reason,
        message: "",
      },
    })
    state.completedReasoning = undefined
    return
  }

  // Handle completion
  if (event.type === "completeRun") {
    if (!state.completionLogged) {
      const text = (event as { text?: string }).text ?? ""
      addEntry({
        id: `completion-${event.runId}`,
        action: {
          type: "complete",
          reasoning: state.completedReasoning,
          text,
        },
      })
      state.completionLogged = true
      state.isComplete = true
      state.completedReasoning = undefined
    }
    return
  }

  // Handle error
  if (event.type === "stopRunByError") {
    const errorEvent = event as {
      error: { name: string; message: string; statusCode?: number; isRetryable?: boolean }
    }
    addEntry({
      id: `error-${event.id}`,
      action: {
        type: "error",
        errorName: errorEvent.error.name,
        error: errorEvent.error.message,
        isRetryable: errorEvent.error.isRetryable,
      },
    })
    state.isComplete = true
    state.completedReasoning = undefined
    return
  }

  // Track tool calls
  if (isToolCallsEvent(event)) {
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
    const reasoning = state.completedReasoning
    let anyLogged = false
    for (const toolResult of event.toolResults) {
      const tool = state.tools.get(toolResult.id)
      if (tool && !tool.logged) {
        const action = toolToCheckpointAction(tool.toolCall, toolResult, reasoning)
        addEntry({
          id: `action-${tool.id}`,
          action,
        })
        tool.logged = true
        anyLogged = true
      }
    }
    if (anyLogged) {
      state.completedReasoning = undefined
    }
  } else if (isToolResultEvent(event)) {
    const { toolResult } = event
    const tool = state.tools.get(toolResult.id)
    if (tool && !tool.logged) {
      const action = toolToCheckpointAction(tool.toolCall, toolResult, state.completedReasoning)
      addEntry({
        id: `action-${tool.id}`,
        action,
      })
      tool.logged = true
      state.completedReasoning = undefined
    }
  }
}
