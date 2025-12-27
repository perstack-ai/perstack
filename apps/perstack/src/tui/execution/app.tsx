import type { PerstackEvent } from "@perstack/core"
import { Box, useApp, useInput } from "ink"
import { StreamingDisplay } from "../components/index.js"
import { ActivityLogPanel, ContinueInputPanel, StatusPanel } from "./components/index.js"
import { useExecutionState } from "./hooks/index.js"
import type { ExecutionParams, ExecutionResult } from "./types.js"

type ExecutionAppProps = ExecutionParams & {
  onReady: (addEvent: (event: PerstackEvent) => void) => void
  onComplete: (result: ExecutionResult) => void
}

export const ExecutionApp = (props: ExecutionAppProps) => {
  const { expertKey, query, config, continueTimeoutMs, historicalEvents, onReady, onComplete } =
    props

  const { exit } = useApp()

  const state = useExecutionState({
    expertKey,
    query,
    config,
    continueTimeoutMs,
    historicalEvents,
    onReady,
    onComplete,
  })

  useInput((input, key) => {
    if (key.ctrl && input === "c") {
      exit()
    }
  })

  return (
    <Box flexDirection="column">
      <ActivityLogPanel activities={state.activities} />
      <StreamingDisplay streaming={state.streaming} />
      <StatusPanel
        runtimeInfo={state.runtimeInfo}
        eventCount={state.eventCount}
        runStatus={state.runStatus}
      />
      <ContinueInputPanel
        isActive={state.isAcceptingContinue}
        runStatus={state.runStatus}
        onSubmit={state.handleContinueSubmit}
      />
    </Box>
  )
}
