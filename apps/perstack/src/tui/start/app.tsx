import type { PerstackEvent } from "@perstack/core"
import { Box, Static, Text } from "ink"
import {
  BrowserRouter,
  CheckpointActionRow,
  RunSetting,
  StreamingDisplay,
} from "../components/index.js"
import { InputAreaProvider } from "../context/index.js"
import { useAppState } from "../hooks/index.js"
import type {
  CheckpointHistoryItem,
  EventHistoryItem,
  ExpertOption,
  InitialRuntimeConfig,
  JobHistoryItem,
} from "../types/index.js"

type AppProps = {
  needsQueryInput?: boolean
  showHistory?: boolean
  initialExpertName?: string
  initialQuery?: string
  initialConfig: InitialRuntimeConfig
  configuredExperts?: ExpertOption[]
  recentExperts?: ExpertOption[]
  historyJobs?: JobHistoryItem[]
  onComplete: (expertKey: string, query: string) => void
  onContinue?: (query: string) => void
  onResumeFromCheckpoint?: (checkpoint: CheckpointHistoryItem) => void
  onLoadCheckpoints?: (job: JobHistoryItem) => Promise<CheckpointHistoryItem[]>
  onLoadEvents?: (
    job: JobHistoryItem,
    checkpoint: CheckpointHistoryItem,
  ) => Promise<EventHistoryItem[]>
  onLoadHistoricalEvents?: (checkpoint: CheckpointHistoryItem) => Promise<PerstackEvent[]>
  onReady: (addEvent: (event: PerstackEvent) => void) => void
}

/**
 * Main TUI application with proper Static/Streaming separation.
 *
 * Architecture:
 * 1. <Static> - Completed actions only (truly static, never re-renders)
 * 2. <StreamingDisplay> - Active streaming content (reasoning/text)
 * 3. Input controls (browser/run settings)
 *
 * This ensures:
 * - Static content remains static (no unnecessary re-renders)
 * - Streaming content is ephemeral and shown only during generation
 * - When streaming completes, content is committed to Static via new activities
 */
export const App = (props: AppProps) => {
  const { runState, runtimeInfo, inputState, inputAreaContextValue } = useAppState(props)
  const isBrowsing =
    inputState.type === "browsingHistory" ||
    inputState.type === "browsingExperts" ||
    inputState.type === "browsingCheckpoints" ||
    inputState.type === "browsingEvents"
  const isEditing = inputState.type === "enteringQuery"
  const showRunSetting = isEditing || inputState.type === "running"

  return (
    <Box flexDirection="column">
      {/* Static section - completed activities (efficient, append-only rendering) */}
      {/* Uses activities directly for stable references and O(N) performance */}
      <Static items={runState.activities}>
        {(activity) => (
          <Box key={activity.id} marginLeft={activity.delegatedBy ? 2 : 0}>
            {/* Show expert indicator for delegated runs */}
            {activity.delegatedBy && activity.type === "query" && (
              <Text dimColor>[{activity.expertKey}] </Text>
            )}
            <CheckpointActionRow action={activity} />
          </Box>
        )}
      </Static>

      {/* Streaming section - active streaming content (sandwiched between static and input) */}
      <StreamingDisplay streaming={runState.streaming} />

      {/* Input controls */}
      <InputAreaProvider value={inputAreaContextValue}>
        {isBrowsing && (
          <BrowserRouter
            inputState={
              inputState as Exclude<
                typeof inputState,
                { type: "enteringQuery" } | { type: "running" }
              >
            }
          />
        )}
      </InputAreaProvider>
      {showRunSetting && (
        <RunSetting
          info={runtimeInfo}
          eventCount={runState.eventCount}
          isEditing={isEditing}
          expertName={isEditing ? inputState.expertName : undefined}
          onQuerySubmit={isEditing ? inputAreaContextValue.onQuerySubmit : undefined}
        />
      )}
    </Box>
  )
}
