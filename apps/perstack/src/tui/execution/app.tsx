import type { PerstackEvent } from "@perstack/core"
import { useRun } from "@perstack/react"
import { Box, Static, Text, useApp, useInput } from "ink"
import { useEffect, useRef, useState } from "react"
import { CheckpointActionRow, RunSetting, StreamingDisplay } from "../components/index.js"
import { useRuntimeInfo, useTextInput } from "../hooks/index.js"
import type { ExecutionParams, ExecutionResult } from "./types.js"

type ExecutionAppProps = ExecutionParams & {
  onReady: (addEvent: (event: PerstackEvent) => void) => void
  onComplete: (result: ExecutionResult) => void
}

export const ExecutionApp = (props: ExecutionAppProps) => {
  const { expertKey, query, config, continueTimeoutMs, historicalEvents, onReady, onComplete } =
    props

  const { exit } = useApp()
  const runState = useRun()

  // Runtime info state
  const { runtimeInfo, handleEvent, setQuery } = useRuntimeInfo({
    initialExpertName: expertKey,
    initialConfig: config,
  })

  // Track run status
  const [runStatus, setRunStatus] = useState<"running" | "completed" | "stopped">("running")
  const [isAcceptingContinue, setIsAcceptingContinue] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Set initial query
  useEffect(() => {
    setQuery(query)
  }, [query, setQuery])

  // Load historical events if resuming
  useEffect(() => {
    if (historicalEvents && historicalEvents.length > 0) {
      runState.appendHistoricalEvents(historicalEvents)
    }
  }, [historicalEvents, runState])

  // Register event handler
  useEffect(() => {
    onReady((event: PerstackEvent) => {
      runState.addEvent(event)
      const result = handleEvent(event)

      if (result?.initialized) {
        // Runtime initialized
      } else if (result?.completed) {
        setRunStatus("completed")
        setIsAcceptingContinue(true)
        // Start timeout for continue input
        timeoutRef.current = setTimeout(() => {
          onComplete({ nextQuery: null })
        }, continueTimeoutMs)
      } else if (result?.stopped) {
        setRunStatus("stopped")
        setIsAcceptingContinue(true)
        // Start timeout for continue input
        timeoutRef.current = setTimeout(() => {
          onComplete({ nextQuery: null })
        }, continueTimeoutMs)
      }
    })
  }, [onReady, runState, handleEvent, continueTimeoutMs, onComplete])

  // Text input for continue query
  const { input: continueInput, handleInput: handleContinueInput } = useTextInput({
    onSubmit: (newQuery) => {
      if (isAcceptingContinue && newQuery.trim()) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
        onComplete({ nextQuery: newQuery.trim() })
      }
    },
  })

  useInput(handleContinueInput, { isActive: isAcceptingContinue })

  // Handle Ctrl+C to exit
  useInput((input, key) => {
    if (key.ctrl && input === "c") {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      exit()
    }
  })

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <Box flexDirection="column">
      {/* Static section - completed activities */}
      <Static items={runState.activities}>
        {(activity) => (
          <Box key={activity.id} marginLeft={activity.delegatedBy ? 2 : 0}>
            {activity.delegatedBy && activity.type === "query" && (
              <Text dimColor>[{activity.expertKey}] </Text>
            )}
            <CheckpointActionRow action={activity} />
          </Box>
        )}
      </Static>

      {/* Streaming section */}
      <StreamingDisplay streaming={runState.streaming} />

      {/* Status bar */}
      {runStatus === "running" ? (
        <RunSetting info={runtimeInfo} eventCount={runState.eventCount} isEditing={false} />
      ) : (
        <Box flexDirection="column" borderStyle="single" borderColor="gray">
          <Text>
            <Text color={runStatus === "completed" ? "green" : "yellow"} bold>
              {runStatus === "completed" ? "Completed" : "Stopped"}
            </Text>
            <Text color="gray"> - Enter a follow-up query or wait to exit</Text>
          </Text>
          <Box>
            <Text color="gray">Continue: </Text>
            <Text>{continueInput}</Text>
            <Text color="cyan">_</Text>
          </Box>
        </Box>
      )}
    </Box>
  )
}
