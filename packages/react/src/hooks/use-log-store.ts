import type { PerstackEvent } from "@perstack/core"
import { useCallback, useRef, useState } from "react"
import type { LogEntry, RuntimeState } from "../types/index.js"
import {
  createInitialLogProcessState,
  type LogProcessState,
  processRunEventToLog,
} from "../utils/event-to-log.js"
import { useRuntimeState } from "./use-runtime-state.js"

export type { LogProcessState }

export type LogStoreResult = {
  /** Accumulated log entries from RunEvent */
  logs: LogEntry[]
  /** Current runtime state from RuntimeEvent */
  runtimeState: RuntimeState
  /** Whether the run is complete */
  isComplete: boolean
  /** Number of events processed */
  eventCount: number
  /** Add a new event to be processed */
  addEvent: (event: PerstackEvent) => void
  /** Append historical events (processes and appends to logs) */
  appendHistoricalEvents: (events: PerstackEvent[]) => void
}

/**
 * Hook for managing log entries from event stream.
 *
 * Architecture:
 * - RunEvent → LogEntry[] (accumulated, append-only)
 * - RuntimeEvent → RuntimeState (latest only, current runtime environment)
 *
 * IMPORTANT: logs are append-only and never cleared.
 * This is required for compatibility with Ink's <Static> component.
 */
export function useLogStore(): LogStoreResult {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [eventCount, setEventCount] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  const { runtimeState, handleRuntimeEvent, clearStreaming } = useRuntimeState()

  const stateRef = useRef<LogProcessState>(createInitialLogProcessState())

  // Process a single event and append resulting logs
  const processEvent = useCallback((event: PerstackEvent) => {
    const newLogs: LogEntry[] = []
    const addEntry = (entry: LogEntry) => newLogs.push(entry)

    processRunEventToLog(stateRef.current, event, addEntry)

    if (newLogs.length > 0) {
      setLogs((prev) => [...prev, ...newLogs])
    }

    setIsComplete(stateRef.current.isComplete)
  }, [])

  const addEvent = useCallback(
    (event: PerstackEvent) => {
      // Try to handle as RuntimeEvent first
      const handled = handleRuntimeEvent(event)
      if (handled) {
        setEventCount((prev) => prev + 1)
        return
      }

      // Clear streaming on completion
      if ("type" in event && (event.type === "completeRun" || event.type === "stopRunByError")) {
        clearStreaming()
      }

      // Process event and append to logs
      processEvent(event)
      setEventCount((prev) => prev + 1)
    },
    [handleRuntimeEvent, clearStreaming, processEvent],
  )

  const appendHistoricalEvents = useCallback((historicalEvents: PerstackEvent[]) => {
    // Process all historical events and append to logs
    const newLogs: LogEntry[] = []
    const addEntry = (entry: LogEntry) => newLogs.push(entry)

    for (const event of historicalEvents) {
      // Handle RuntimeEvents for state extraction (but don't update runtimeState for historical)
      // Only process RunEvents for logs
      processRunEventToLog(stateRef.current, event, addEntry)
    }

    if (newLogs.length > 0) {
      setLogs((prev) => [...prev, ...newLogs])
    }

    setEventCount((prev) => prev + historicalEvents.length)
    setIsComplete(stateRef.current.isComplete)
  }, [])

  return {
    logs,
    runtimeState,
    isComplete,
    eventCount,
    addEvent,
    appendHistoricalEvents,
  }
}
