import type { RunEvent, ToolCall, ToolResult } from "@perstack/core"
import { useCallback, useEffect, useRef, useState } from "react"
import { UI_CONSTANTS } from "../../constants.js"
import type { LogEntry, PerstackEvent } from "../../types/index.js"

const TOOL_RESULT_EVENT_TYPES = new Set(["resolveToolResults", "attemptCompletion"])

/** Streaming events are fire-and-forget and should not be counted in event history */
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
const checkIsSuccess = (result: Array<{ type: string; text?: string }>): boolean => {
  const textPart = result.find((r) => r.type === "textPart")
  if (!textPart || typeof textPart.text !== "string") return true
  const text = textPart.text.toLowerCase()
  return !text.startsWith("error") && !text.includes("failed")
}
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
type ToolState = {
  id: string
  toolName: string
  args: Record<string, unknown>
  result?: Array<{ type: string; text?: string }>
  isSuccess?: boolean
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
  streamingText?: string
  /** Accumulated streaming reasoning text */
  streamingReasoning?: string
  /** Whether reasoning stream is active */
  isReasoningStreaming?: boolean
  /** Whether run result stream is active */
  isRunResultStreaming?: boolean
}
const processEventToLogs = (
  state: ProcessState,
  event: PerstackEvent,
  addLog: (entry: LogEntry) => void,
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
    addLog({
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
    addLog({
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
    addLog({
      id: `proxy-access-${event.id}`,
      type: "proxy-access",
      action: proxyEvent.action,
      domain: proxyEvent.domain,
      port: proxyEvent.port,
      reason: proxyEvent.reason,
    })
    return
  }

  // Handle completeReasoning events (native LLM reasoning / extended thinking)
  if (event.type === "completeReasoning") {
    const reasoningEvent = event as { text: string }
    addLog({
      id: `completeReasoning-${event.id}`,
      type: "completeReasoning",
      text: reasoningEvent.text,
    })
    state.isReasoningStreaming = false
    state.streamingReasoning = undefined // Clear streaming state after completion
    return
  }

  // Note: Streaming events (startReasoning, streamReasoning, startRunResult, streamRunResult)
  // are handled directly in addEvent() and do not reach this function

  // Handle retry events
  if (event.type === "retry") {
    const retryEvent = event as { reason: string }
    addLog({
      id: `retry-${event.id}`,
      type: "retry",
      reason: retryEvent.reason,
    })
    // Clear streaming state on retry (stale content from failed attempt)
    state.streamingText = undefined
    state.streamingReasoning = undefined
    return
  }

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
      addLog({
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
  if (event.type === "streamingText" && "text" in event) {
    if (!isDelegation) {
      state.streamingText = event.text
    }
    return
  }
  if (event.type === "completeRun") {
    if (isDelegation) {
      const pending = state.pendingDelegations.get(runId)
      if (pending) {
        addLog({
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
      // Use event text, or fall back to accumulated streaming text
      const text = (event as { text?: string }).text || state.streamingText
      if (text) {
        addLog({ id: `completion-${runId}`, type: "completion", text })
      }
      state.completionLogged = true
      state.isComplete = true
      state.streamingText = undefined
      state.streamingReasoning = undefined // Clear streaming reasoning on completion
    }
    return
  }
  if (event.type === "stopRunByError") {
    const errorEvent = event as {
      error: { name: string; message: string; statusCode?: number }
    }
    addLog({
      id: `error-${event.id}`,
      type: "error",
      errorName: errorEvent.error.name,
      message: errorEvent.error.message,
      statusCode: errorEvent.error.statusCode,
    })
    state.isComplete = true
    state.streamingText = undefined
    state.streamingReasoning = undefined // Clear streaming reasoning on error termination
    return
  }
  if (isDelegation) return
  if (event.type === "startRun") {
    const query = extractQuery(event)
    if (query) {
      if (state.completionLogged) {
        state.completionLogged = false
        state.isComplete = false
        state.queryLogged = false
      }
      if (!state.queryLogged) {
        addLog({ id: `query-${runId}`, type: "query", text: query })
        state.queryLogged = true
      }
    }
  } else if (isToolCallsEvent(event)) {
    for (const toolCall of event.toolCalls) {
      if (!state.tools.has(toolCall.id)) {
        state.tools.set(toolCall.id, {
          id: toolCall.id,
          toolName: toolCall.toolName,
          args: toolCall.args as Record<string, unknown>,
          logged: false,
        })
      }
    }
  } else if (isToolCallEvent(event)) {
    const { toolCall } = event
    if (!state.tools.has(toolCall.id)) {
      state.tools.set(toolCall.id, {
        id: toolCall.id,
        toolName: toolCall.toolName,
        args: toolCall.args as Record<string, unknown>,
        logged: false,
      })
    }
  } else if (isToolResultsEvent(event)) {
    for (const toolResult of event.toolResults) {
      const tool = state.tools.get(toolResult.id)
      if (tool && !tool.logged && Array.isArray(toolResult.result)) {
        tool.result = toolResult.result
        tool.isSuccess = checkIsSuccess(toolResult.result)
        addLog({
          id: `tool-${tool.id}`,
          type: "tool",
          toolName: tool.toolName,
          args: tool.args,
          result: tool.result,
          isSuccess: tool.isSuccess,
        })
        tool.logged = true
      }
    }
  } else if (isToolResultEvent(event)) {
    const { toolResult } = event
    const tool = state.tools.get(toolResult.id)
    if (tool && !tool.logged && Array.isArray(toolResult.result)) {
      tool.result = toolResult.result
      tool.isSuccess = checkIsSuccess(toolResult.result)
      addLog({
        id: `tool-${tool.id}`,
        type: "tool",
        toolName: tool.toolName,
        args: tool.args,
        result: tool.result,
        isSuccess: tool.isSuccess,
      })
      tool.logged = true
    }
  }
}
export const useEventStore = () => {
  const [events, setEvents] = useState<PerstackEvent[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [streamingText, setStreamingText] = useState<string | undefined>()
  const [streamingReasoning, setStreamingReasoning] = useState<string | undefined>()
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
    // Handle streaming events directly without adding to events array
    // Streaming events are fire-and-forget and should not inflate event count
    if ("type" in event && STREAMING_EVENT_TYPES.has(event.type)) {
      if (event.type === "startReasoning") {
        stateRef.current.streamingReasoning = ""
        stateRef.current.isReasoningStreaming = true
        setStreamingReasoning("")
      } else if (event.type === "streamReasoning") {
        const delta = (event as { delta: string }).delta
        stateRef.current.streamingReasoning = (stateRef.current.streamingReasoning ?? "") + delta
        setStreamingReasoning(stateRef.current.streamingReasoning)
      } else if (event.type === "startRunResult") {
        stateRef.current.isRunResultStreaming = true
        stateRef.current.streamingText = ""
        setStreamingText("")
      } else if (event.type === "streamRunResult") {
        const delta = (event as { delta: string }).delta
        stateRef.current.streamingText = (stateRef.current.streamingText ?? "") + delta
        setStreamingText(stateRef.current.streamingText)
      }
      return
    }

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
  useEffect(() => {
    if (needsRebuildRef.current) {
      stateRef.current = {
        tools: new Map(),
        pendingDelegations: new Map(),
        queryLogged: false,
        completionLogged: false,
        isComplete: false,
      }
      setLogs([])
      processedCountRef.current = 0
      needsRebuildRef.current = false
    }
    const newEvents = events.slice(processedCountRef.current)
    const newLogs: LogEntry[] = []
    const addLog = (entry: LogEntry) => newLogs.push(entry)
    for (const event of newEvents) {
      processEventToLogs(stateRef.current, event, addLog)
    }
    processedCountRef.current = events.length
    if (newLogs.length > 0) {
      setLogs((prev) => [...prev, ...newLogs])
    }
    setStreamingText(stateRef.current.streamingText)
    setStreamingReasoning(stateRef.current.streamingReasoning)
    setIsComplete(stateRef.current.isComplete)
  }, [events])
  return {
    logs,
    streamingText,
    streamingReasoning,
    isComplete,
    eventCount: events.length,
    addEvent,
    setHistoricalEvents,
  }
}
