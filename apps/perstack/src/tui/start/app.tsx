import type { PerstackEvent } from "@perstack/core"
import type { LogEntry } from "@perstack/react"
import { Box, Static, Text } from "ink"
import { useMemo } from "react"
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

type StaticItem =
  | { type: "header"; runId: string; expertKey: string }
  | { type: "entry"; entry: LogEntry }
  | { type: "footer"; runId: string }

/**
 * Converts log entries into a flat list of static items with group headers/footers.
 * This enables efficient rendering with Ink's <Static> component.
 */
function createStaticItems(logs: LogEntry[]): StaticItem[] {
  const items: StaticItem[] = []
  let lastRunId: string | undefined

  for (const entry of logs) {
    // Check if we're starting a new delegated group
    if (entry.runId !== lastRunId) {
      // Close previous group footer if it was delegated
      if (lastRunId !== undefined) {
        const prevEntry = logs.find((e) => e.runId === lastRunId && e.delegatedBy)
        if (prevEntry?.delegatedBy) {
          items.push({ type: "footer", runId: lastRunId })
        }
      }

      // Add header for new delegated group
      if (entry.delegatedBy) {
        items.push({ type: "header", runId: entry.runId, expertKey: entry.expertKey })
      }
    }

    items.push({ type: "entry", entry })
    lastRunId = entry.runId
  }

  // Close final group footer if delegated
  if (lastRunId !== undefined) {
    const lastEntry = logs.find((e) => e.runId === lastRunId && e.delegatedBy)
    if (lastEntry?.delegatedBy) {
      items.push({ type: "footer", runId: lastRunId })
    }
  }

  return items
}

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
 * - When streaming completes, content is committed to Static via new entries
 */
export const App = (props: AppProps) => {
  const { logStore, runtimeInfo, inputState, inputAreaContextValue } = useAppState(props)
  const isBrowsing =
    inputState.type === "browsingHistory" ||
    inputState.type === "browsingExperts" ||
    inputState.type === "browsingCheckpoints" ||
    inputState.type === "browsingEvents"
  const isEditing = inputState.type === "enteringQuery"
  const showRunSetting = isEditing || inputState.type === "running"

  // Create static items with group headers/footers for efficient rendering
  const staticItems = useMemo(() => createStaticItems(logStore.logs), [logStore.logs])

  return (
    <Box flexDirection="column">
      {/* Static section - completed actions (efficient, append-only rendering) */}
      <Static items={staticItems}>
        {(item) => {
          if (item.type === "header") {
            return (
              <Text key={`header-${item.runId}`} dimColor>
                ┌─ {item.expertKey} ─────────────────────────────
              </Text>
            )
          }
          if (item.type === "footer") {
            return (
              <Text key={`footer-${item.runId}`} dimColor>
                └─────────────────────────────────────────────────
              </Text>
            )
          }
          return <CheckpointActionRow key={item.entry.id} action={item.entry.action} />
        }}
      </Static>

      {/* Streaming section - active streaming content (sandwiched between static and input) */}
      <StreamingDisplay streaming={logStore.runtimeState.streaming} />

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
          eventCount={logStore.eventCount}
          isEditing={isEditing}
          expertName={isEditing ? inputState.expertName : undefined}
          onQuerySubmit={isEditing ? inputAreaContextValue.onQuerySubmit : undefined}
        />
      )}
    </Box>
  )
}
