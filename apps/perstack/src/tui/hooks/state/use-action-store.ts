import type { CheckpointAction, RunEvent, ToolCall, ToolResult } from "@perstack/core"
import { useCallback, useEffect, useRef, useState } from "react"
import { UI_CONSTANTS } from "../../constants.js"
import type { ActionEntry, PerstackEvent, StreamingState } from "../../types/index.js"

/** Events that indicate tool results are available */
const TOOL_RESULT_EVENT_TYPES = new Set(["resolveToolResults", "attemptCompletion"])

/** Streaming events are handled separately and don't create ActionEntry */
const STREAMING_EVENT_TYPES = new Set([
  "startReasoning",
  "streamReasoning",
  "startRunResult",
  "streamRunResult",
])

const isToolCallsEvent = (event: PerstackEvent): event is RunEvent & { toolCalls: ToolCall[] } =>
  "type" in event && event.type === "callTools" && "toolCalls" in event

const isToolCallEvent = (event: PerstackEvent): event is RunEvent & { toolCall: ToolCall } =>
  "type" in event &&
  (event.type === "callInteractiveTool" || event.type === "callDelegate") &&
  "toolCall" in event

const isToolResultsEvent = (
  event: PerstackEvent,
): event is RunEvent & { toolResults: ToolResult[] } =>
  "type" in event && event.type === "resolveToolResults" && "toolResults" in event

const isToolResultEvent = (event: PerstackEvent): event is RunEvent & { toolResult: ToolResult } =>
  "type" in event && TOOL_RESULT_EVENT_TYPES.has(event.type) && "toolResult" in event

const extractQuery = (event: Extract<RunEvent, { type: "startRun" }>): string | undefined => {
  const userMessage = event.inputMessages.find((m) => m.type === "userMessage")
  if (userMessage?.type !== "userMessage") return undefined
  return userMessage.contents.find((c) => c.type === "textPart")?.text
}

const formatRuntimeName = (runtime: string): string => {
  if (runtime === "claude-code") return "Claude Code"
  if (runtime === "local") return "Local"
  return runtime.charAt(0).toUpperCase() + runtime.slice(1)
}

/** Convert tool call + result to CheckpointAction */
function toolToCheckpointAction(
  toolCall: ToolCall,
  toolResult: ToolResult,
  reasoning?: string,
): CheckpointAction {
  const { skillName, toolName, args } = toolCall
  const result = toolResult.result

  // Check for error in result
  const errorText = (() => {
    const textPart = result.find((p) => p.type === "textPart")
    if (!textPart || !("text" in textPart) || typeof textPart.text !== "string") return undefined
    try {
      const parsed = JSON.parse(textPart.text) as { error?: string }
      return typeof parsed.error === "string" ? parsed.error : undefined
    } catch {
      const text = textPart.text.toLowerCase()
      return text.startsWith("error") || text.includes("failed") ? textPart.text : undefined
    }
  })()

  // Base skill tools
  if (skillName === "@perstack/base") {
    switch (toolName) {
      case "attemptCompletion":
        return { type: "attemptCompletion", reasoning, error: errorText }
      case "todo":
        return {
          type: "todo",
          reasoning,
          newTodos: Array.isArray(args["newTodos"]) ? args["newTodos"].map(String) : undefined,
          completedTodos: Array.isArray(args["completedTodos"])
            ? args["completedTodos"].map(Number)
            : undefined,
          todos: [],
          error: errorText,
        }
      case "clearTodo":
        return { type: "clearTodo", reasoning, error: errorText }
      case "readTextFile":
        return {
          type: "readTextFile",
          reasoning,
          path: String(args["path"] ?? ""),
          error: errorText,
        }
      case "writeTextFile":
        return {
          type: "writeTextFile",
          reasoning,
          path: String(args["path"] ?? ""),
          text: String(args["text"] ?? ""),
          error: errorText,
        }
      case "editTextFile":
        return {
          type: "editTextFile",
          reasoning,
          path: String(args["path"] ?? ""),
          oldText: String(args["oldText"] ?? ""),
          newText: String(args["newText"] ?? ""),
          error: errorText,
        }
      case "appendTextFile":
        return {
          type: "appendTextFile",
          reasoning,
          path: String(args["path"] ?? ""),
          text: String(args["text"] ?? ""),
          error: errorText,
        }
      case "deleteFile":
        return {
          type: "deleteFile",
          reasoning,
          path: String(args["path"] ?? ""),
          error: errorText,
        }
      case "deleteDirectory":
        return {
          type: "deleteDirectory",
          reasoning,
          path: String(args["path"] ?? ""),
          recursive: typeof args["recursive"] === "boolean" ? args["recursive"] : undefined,
          error: errorText,
        }
      case "moveFile":
        return {
          type: "moveFile",
          reasoning,
          source: String(args["source"] ?? ""),
          destination: String(args["destination"] ?? ""),
          error: errorText,
        }
      case "createDirectory":
        return {
          type: "createDirectory",
          reasoning,
          path: String(args["path"] ?? ""),
          error: errorText,
        }
      case "listDirectory":
        return {
          type: "listDirectory",
          reasoning,
          path: String(args["path"] ?? ""),
          error: errorText,
        }
      case "getFileInfo":
        return {
          type: "getFileInfo",
          reasoning,
          path: String(args["path"] ?? ""),
          error: errorText,
        }
      case "readImageFile":
        return {
          type: "readImageFile",
          reasoning,
          path: String(args["path"] ?? ""),
          error: errorText,
        }
      case "readPdfFile":
        return {
          type: "readPdfFile",
          reasoning,
          path: String(args["path"] ?? ""),
          error: errorText,
        }
      case "exec":
        return {
          type: "exec",
          reasoning,
          command: String(args["command"] ?? ""),
          args: Array.isArray(args["args"]) ? args["args"].map(String) : [],
          cwd: String(args["cwd"] ?? ""),
          error: errorText,
        }
    }
  }

  // General tool (non-base skill)
  return {
    type: "generalTool",
    reasoning,
    skillName,
    toolName,
    args: args as Record<string, unknown>,
    result,
    error: errorText,
  }
}

type ToolState = {
  id: string
  toolCall: ToolCall
  logged: boolean
}

type PendingDelegation = {
  expertName: string
  runtime: string
  version: string
  query?: string
}

type ProcessState = {
  rootRunId?: string
  tools: Map<string, ToolState>
  pendingDelegations: Map<string, PendingDelegation>
  queryLogged: boolean
  completionLogged: boolean
  isComplete: boolean
  /** Accumulated reasoning from completeReasoning event */
  completedReasoning?: string
}

const processEventToActions = (
  state: ProcessState,
  event: PerstackEvent,
  addAction: (entry: ActionEntry) => void,
): void => {
  if (!("runId" in event)) return
  const runId = event.runId

  // Handle Docker build progress events
  if (event.type === "dockerBuildProgress") {
    const buildEvent = event as {
      stage: "pulling" | "building" | "complete" | "error"
      service: string
      message: string
      progress?: number
    }
    addAction({
      id: `docker-build-${event.id}`,
      type: "docker-build",
      stage: buildEvent.stage,
      service: buildEvent.service,
      message: buildEvent.message,
      progress: buildEvent.progress,
    })
    return
  }

  // Handle Docker container status events
  if (event.type === "dockerContainerStatus") {
    const containerEvent = event as {
      status: "starting" | "running" | "healthy" | "unhealthy" | "stopped" | "error"
      service: string
      message?: string
    }
    addAction({
      id: `docker-container-${event.id}`,
      type: "docker-container",
      status: containerEvent.status,
      service: containerEvent.service,
      message: containerEvent.message,
    })
    return
  }

  // Handle proxy access events
  if (event.type === "proxyAccess") {
    const proxyEvent = event as {
      action: "allowed" | "blocked"
      domain: string
      port: number
      reason?: string
    }
    addAction({
      id: `proxy-access-${event.id}`,
      type: "proxy-access",
      action: proxyEvent.action,
      domain: proxyEvent.domain,
      port: proxyEvent.port,
      reason: proxyEvent.reason,
    })
    return
  }

  // Handle completeReasoning events - store for next action
  if (event.type === "completeReasoning") {
    const reasoningEvent = event as { text: string }
    state.completedReasoning = reasoningEvent.text
    return
  }

  // Handle retry events
  if (event.type === "retry") {
    const retryEvent = event as { reason: string }
    addAction({
      id: `retry-${event.id}`,
      type: "action",
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

  // Handle delegation initialization
  if (event.type === "initializeRuntime") {
    if (!state.rootRunId) {
      state.rootRunId = runId
    } else if (runId !== state.rootRunId) {
      const expertName = (event as { expertName?: string }).expertName ?? "unknown"
      const runtime = formatRuntimeName(
        (event as { runtime?: string }).runtime ??
          (event as { model?: string }).model?.split(":")[0] ??
          "unknown",
      )
      const version = (event as { runtimeVersion?: string }).runtimeVersion ?? "unknown"
      const query = (event as { query?: string }).query
      state.pendingDelegations.set(runId, { expertName, runtime, version, query })
      addAction({
        id: `delegation-started-${runId}`,
        type: "delegation-started",
        expertName,
        runtime,
        version,
        query,
      })
    }
    return
  }

  const isDelegation = state.rootRunId && runId !== state.rootRunId

  // Handle run completion
  if (event.type === "completeRun") {
    if (isDelegation) {
      const pending = state.pendingDelegations.get(runId)
      if (pending) {
        addAction({
          id: `delegation-completed-${runId}`,
          type: "delegation-completed",
          expertName: pending.expertName,
          runtime: pending.runtime,
          version: pending.version,
          result: (event as { text?: string }).text,
        })
        state.pendingDelegations.delete(runId)
      }
    } else if (!state.completionLogged) {
      const text = (event as { text?: string }).text ?? ""
      addAction({
        id: `completion-${runId}`,
        type: "action",
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
      error: { name: string; message: string; statusCode?: number }
    }
    addAction({
      id: `error-${event.id}`,
      type: "error",
      errorName: errorEvent.error.name,
      message: errorEvent.error.message,
      statusCode: errorEvent.error.statusCode,
    })
    state.isComplete = true
    state.completedReasoning = undefined
    return
  }

  // Skip delegation events for tool processing
  if (isDelegation) return

  // Handle start run (query)
  if (event.type === "startRun") {
    const query = extractQuery(event)
    if (query) {
      if (state.completionLogged) {
        state.completionLogged = false
        state.isComplete = false
        state.queryLogged = false
      }
      if (!state.queryLogged) {
        addAction({ id: `query-${runId}`, type: "query", text: query })
        state.queryLogged = true
      }
    }
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
    for (const toolResult of event.toolResults) {
      const tool = state.tools.get(toolResult.id)
      if (tool && !tool.logged) {
        const action = toolToCheckpointAction(tool.toolCall, toolResult, state.completedReasoning)
        addAction({
          id: `action-${tool.id}`,
          type: "action",
          action,
        })
        tool.logged = true
        state.completedReasoning = undefined
      }
    }
  } else if (isToolResultEvent(event)) {
    const { toolResult } = event
    const tool = state.tools.get(toolResult.id)
    if (tool && !tool.logged) {
      const action = toolToCheckpointAction(tool.toolCall, toolResult, state.completedReasoning)
      addAction({
        id: `action-${tool.id}`,
        type: "action",
        action,
      })
      tool.logged = true
      state.completedReasoning = undefined
    }
  }
}

export const useActionStore = () => {
  const [events, setEvents] = useState<PerstackEvent[]>([])
  const [actions, setActions] = useState<ActionEntry[]>([])
  const [streaming, setStreaming] = useState<StreamingState>({})
  const [isComplete, setIsComplete] = useState(false)

  const stateRef = useRef<ProcessState>({
    tools: new Map(),
    pendingDelegations: new Map(),
    queryLogged: false,
    completionLogged: false,
    isComplete: false,
  })
  const processedCountRef = useRef(0)
  const needsRebuildRef = useRef(false)

  const addEvent = useCallback((event: PerstackEvent) => {
    // Handle streaming events directly (update streaming state, don't add to events)
    if ("type" in event && STREAMING_EVENT_TYPES.has(event.type)) {
      if (event.type === "startReasoning") {
        setStreaming((prev) => ({ ...prev, reasoning: "", isReasoningActive: true }))
      } else if (event.type === "streamReasoning") {
        const delta = (event as { delta: string }).delta
        setStreaming((prev) => ({
          ...prev,
          reasoning: (prev.reasoning ?? "") + delta,
        }))
      } else if (event.type === "startRunResult") {
        setStreaming((prev) => ({ ...prev, text: "", isTextActive: true }))
      } else if (event.type === "streamRunResult") {
        const delta = (event as { delta: string }).delta
        setStreaming((prev) => ({
          ...prev,
          text: (prev.text ?? "") + delta,
        }))
      }
      return
    }

    // Clear streaming when completing
    if ("type" in event && (event.type === "completeRun" || event.type === "stopRunByError")) {
      setStreaming({})
    }

    // Add event to queue
    setEvents((prev) => {
      const newEvents = [...prev, event]
      if (newEvents.length > UI_CONSTANTS.MAX_EVENTS) {
        needsRebuildRef.current = true
        return newEvents.slice(-UI_CONSTANTS.MAX_EVENTS)
      }
      return newEvents
    })
  }, [])

  const setHistoricalEvents = useCallback((historicalEvents: PerstackEvent[]) => {
    needsRebuildRef.current = true
    setEvents(
      historicalEvents.length > UI_CONSTANTS.MAX_EVENTS
        ? historicalEvents.slice(-UI_CONSTANTS.MAX_EVENTS)
        : historicalEvents,
    )
  }, [])

  // Process events into actions
  useEffect(() => {
    if (needsRebuildRef.current) {
      stateRef.current = {
        tools: new Map(),
        pendingDelegations: new Map(),
        queryLogged: false,
        completionLogged: false,
        isComplete: false,
      }
      setActions([])
      processedCountRef.current = 0
      needsRebuildRef.current = false
    }

    const newEvents = events.slice(processedCountRef.current)
    const newActions: ActionEntry[] = []
    const addAction = (entry: ActionEntry) => newActions.push(entry)

    for (const event of newEvents) {
      processEventToActions(stateRef.current, event, addAction)
    }

    processedCountRef.current = events.length

    if (newActions.length > 0) {
      setActions((prev) => [...prev, ...newActions])
    }

    setIsComplete(stateRef.current.isComplete)
  }, [events])

  return {
    /** Completed actions for Static display */
    actions,
    /** Streaming state for dynamic display */
    streaming,
    /** Whether the run is complete */
    isComplete,
    /** Total event count */
    eventCount: events.length,
    /** Add a new event */
    addEvent,
    /** Set historical events for replay */
    setHistoricalEvents,
  }
}
