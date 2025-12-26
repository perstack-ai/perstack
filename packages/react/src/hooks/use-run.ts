import type { Activity, PerstackEvent, StreamingEvent } from "@perstack/core"
import { useCallback, useRef, useState } from "react"
import type { StreamingState } from "../types/index.js"
import {
  type ActivityProcessState,
  createInitialActivityProcessState,
  processRunEventToActivity,
} from "../utils/event-to-activity.js"

export type { ActivityProcessState }

const STREAMING_EVENT_TYPES = new Set([
  "startStreamingReasoning",
  "streamReasoning",
  "completeStreamingReasoning",
  "startStreamingRunResult",
  "streamRunResult",
  "completeStreamingRunResult",
])

const isStreamingEvent = (event: PerstackEvent): event is StreamingEvent =>
  "type" in event && "expertKey" in event && STREAMING_EVENT_TYPES.has(event.type)

export type RunResult = {
  /** Accumulated activities from RunEvent */
  activities: Activity[]
  /** Current streaming state */
  streaming: StreamingState
  /** Whether the run is complete */
  isComplete: boolean
  /** Number of events processed */
  eventCount: number
  /** Add a new event to be processed */
  addEvent: (event: PerstackEvent) => void
  /** Append historical events (processes and appends to activities) */
  appendHistoricalEvents: (events: PerstackEvent[]) => void
  /** Clear streaming state */
  clearStreaming: () => void
}

/**
 * Hook for managing Run state from RunEvent stream.
 *
 * Architecture:
 * - ExpertStateEvent → Activity[] (accumulated, append-only)
 * - StreamingEvent → StreamingState (latest only, for display)
 *
 * IMPORTANT: activities are append-only and never cleared.
 * This is required for compatibility with Ink's <Static> component.
 */
export function useRun(): RunResult {
  const [activities, setActivities] = useState<Activity[]>([])
  const [streaming, setStreaming] = useState<StreamingState>({})
  const [eventCount, setEventCount] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  const stateRef = useRef<ActivityProcessState>(createInitialActivityProcessState())

  const clearStreaming = useCallback(() => {
    setStreaming({})
  }, [])

  const handleStreamingEvent = useCallback((event: StreamingEvent): boolean => {
    switch (event.type) {
      case "startStreamingReasoning": {
        setStreaming((prev) => ({
          ...prev,
          reasoning: "",
          isReasoningActive: true,
        }))
        return true
      }

      case "streamReasoning": {
        const e = event as StreamingEvent & { type: "streamReasoning" }
        setStreaming((prev) => ({
          ...prev,
          reasoning: (prev.reasoning ?? "") + e.delta,
        }))
        return true
      }

      case "completeStreamingReasoning": {
        setStreaming((prev) => ({
          ...prev,
          isReasoningActive: false,
        }))
        return false
      }

      case "startStreamingRunResult": {
        setStreaming({
          reasoning: undefined,
          isReasoningActive: false,
          runResult: "",
          isRunResultActive: true,
        })
        return true
      }

      case "streamRunResult": {
        const e = event as StreamingEvent & { type: "streamRunResult" }
        setStreaming((prev) => ({
          ...prev,
          runResult: (prev.runResult ?? "") + e.delta,
        }))
        return true
      }

      case "completeStreamingRunResult": {
        setStreaming((prev) => ({
          ...prev,
          isRunResultActive: false,
        }))
        return true
      }

      default:
        return false
    }
  }, [])

  const processEvent = useCallback((event: PerstackEvent) => {
    const newActivities: Activity[] = []
    const addActivity = (activity: Activity) => newActivities.push(activity)

    processRunEventToActivity(stateRef.current, event, addActivity)

    if (newActivities.length > 0) {
      setActivities((prev) => [...prev, ...newActivities])
    }

    const rootRunComplete = Array.from(stateRef.current.runStates.values()).some(
      (rs) => rs.isComplete && !rs.delegatedBy,
    )
    setIsComplete(rootRunComplete)
  }, [])

  const addEvent = useCallback(
    (event: PerstackEvent) => {
      if (isStreamingEvent(event)) {
        const handled = handleStreamingEvent(event)
        if (handled) {
          setEventCount((prev) => prev + 1)
          return
        }
      }

      if ("type" in event && (event.type === "completeRun" || event.type === "stopRunByError")) {
        clearStreaming()
      }

      processEvent(event)
      setEventCount((prev) => prev + 1)
    },
    [handleStreamingEvent, clearStreaming, processEvent],
  )

  const appendHistoricalEvents = useCallback((historicalEvents: PerstackEvent[]) => {
    const newActivities: Activity[] = []
    const addActivity = (activity: Activity) => newActivities.push(activity)

    for (const event of historicalEvents) {
      processRunEventToActivity(stateRef.current, event, addActivity)
    }

    if (newActivities.length > 0) {
      setActivities((prev) => [...prev, ...newActivities])
    }

    setEventCount((prev) => prev + historicalEvents.length)
    const rootRunComplete = Array.from(stateRef.current.runStates.values()).some(
      (rs) => rs.isComplete && !rs.delegatedBy,
    )
    setIsComplete(rootRunComplete)
  }, [])

  return {
    activities,
    streaming,
    isComplete,
    eventCount,
    addEvent,
    appendHistoricalEvents,
    clearStreaming,
  }
}
