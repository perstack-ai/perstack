import type { PerstackEvent } from "@perstack/core"
import { useRun } from "@perstack/react"
import { useApp } from "ink"
import { useCallback, useEffect, useRef, useState } from "react"
import { useRuntimeInfo } from "../../hooks/index.js"
import type { InitialRuntimeConfig } from "../../types/index.js"

export type RunStatus = "running" | "completed" | "stopped"

type UseExecutionStateOptions = {
  expertKey: string
  query: string
  config: InitialRuntimeConfig
  continueTimeoutMs: number
  historicalEvents?: PerstackEvent[]
  onReady: (addEvent: (event: PerstackEvent) => void) => void
  onComplete: (result: { nextQuery: string | null }) => void
}

export type ExecutionState = {
  activities: ReturnType<typeof useRun>["activities"]
  streaming: ReturnType<typeof useRun>["streaming"]
  eventCount: number
  runtimeInfo: ReturnType<typeof useRuntimeInfo>["runtimeInfo"]
  runStatus: RunStatus
  isAcceptingContinue: boolean
  handleContinueSubmit: (query: string) => void
  clearTimeout: () => void
}

export const useExecutionState = (options: UseExecutionStateOptions): ExecutionState => {
  const { expertKey, query, config, continueTimeoutMs, historicalEvents, onReady, onComplete } =
    options

  const { exit } = useApp()
  const runState = useRun()

  const { runtimeInfo, handleEvent, setQuery } = useRuntimeInfo({
    initialExpertName: expertKey,
    initialConfig: config,
  })

  const [runStatus, setRunStatus] = useState<RunStatus>("running")
  const [isAcceptingContinue, setIsAcceptingContinue] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const clearTimeoutIfExists = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const startExitTimeout = useCallback(() => {
    clearTimeoutIfExists()
    timeoutRef.current = setTimeout(() => {
      onComplete({ nextQuery: null })
      exit()
    }, continueTimeoutMs)
  }, [clearTimeoutIfExists, continueTimeoutMs, onComplete, exit])

  useEffect(() => {
    setQuery(query)
  }, [query, setQuery])

  useEffect(() => {
    if (historicalEvents && historicalEvents.length > 0) {
      runState.appendHistoricalEvents(historicalEvents)
    }
  }, [historicalEvents, runState.appendHistoricalEvents])

  useEffect(() => {
    onReady((event: PerstackEvent) => {
      runState.addEvent(event)
      const result = handleEvent(event)

      if (result?.completed) {
        setRunStatus("completed")
        setIsAcceptingContinue(true)
        startExitTimeout()
      } else if (result?.stopped) {
        setRunStatus("stopped")
        setIsAcceptingContinue(true)
        startExitTimeout()
      }
    })
  }, [onReady, runState.addEvent, handleEvent, startExitTimeout])

  useEffect(() => {
    return () => {
      clearTimeoutIfExists()
    }
  }, [clearTimeoutIfExists])

  const handleContinueSubmit = useCallback(
    (newQuery: string) => {
      if (isAcceptingContinue && newQuery.trim()) {
        clearTimeoutIfExists()
        onComplete({ nextQuery: newQuery.trim() })
        exit()
      }
    },
    [isAcceptingContinue, clearTimeoutIfExists, onComplete, exit],
  )

  return {
    activities: runState.activities,
    streaming: runState.streaming,
    eventCount: runState.eventCount,
    runtimeInfo,
    runStatus,
    isAcceptingContinue,
    handleContinueSubmit,
    clearTimeout: clearTimeoutIfExists,
  }
}
