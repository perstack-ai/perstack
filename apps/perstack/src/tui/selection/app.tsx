import { Box, Text, useApp, useInput } from "ink"
import { useCallback, useEffect, useMemo, useReducer, useState } from "react"
import { BrowserRouter } from "../components/index.js"
import { InputAreaProvider, type InputAreaContextValue } from "../context/index.js"
import { assertNever } from "../helpers.js"
import { useTextInput } from "../hooks/index.js"
import type {
  CheckpointHistoryItem,
  ExpertOption,
  JobHistoryItem,
} from "../types/index.js"
import type { SelectionParams, SelectionResult } from "./types.js"

// Selection-specific input states (excludes running state)
type SelectionState =
  | { type: "browsingHistory"; jobs: JobHistoryItem[] }
  | { type: "browsingExperts"; experts: ExpertOption[] }
  | { type: "browsingCheckpoints"; job: JobHistoryItem; checkpoints: CheckpointHistoryItem[] }
  | { type: "enteringQuery"; expertKey: string }

type SelectionAction =
  | { type: "BROWSE_HISTORY"; jobs: JobHistoryItem[] }
  | { type: "BROWSE_EXPERTS"; experts: ExpertOption[] }
  | { type: "SELECT_EXPERT"; expertKey: string }
  | { type: "SELECT_JOB"; job: JobHistoryItem; checkpoints: CheckpointHistoryItem[] }
  | { type: "GO_BACK_FROM_CHECKPOINTS"; jobs: JobHistoryItem[] }

const selectionReducer = (_state: SelectionState, action: SelectionAction): SelectionState => {
  switch (action.type) {
    case "BROWSE_HISTORY":
      return { type: "browsingHistory", jobs: action.jobs }
    case "BROWSE_EXPERTS":
      return { type: "browsingExperts", experts: action.experts }
    case "SELECT_EXPERT":
      return { type: "enteringQuery", expertKey: action.expertKey }
    case "SELECT_JOB":
      return { type: "browsingCheckpoints", job: action.job, checkpoints: action.checkpoints }
    case "GO_BACK_FROM_CHECKPOINTS":
      return { type: "browsingHistory", jobs: action.jobs }
    default:
      return assertNever(action)
  }
}

type SelectionAppProps = SelectionParams & {
  onComplete: (result: SelectionResult) => void
}

export const SelectionApp = (props: SelectionAppProps) => {
  const {
    showHistory,
    initialExpertKey,
    initialQuery,
    initialCheckpoint,
    configuredExperts,
    recentExperts,
    historyJobs,
    onLoadCheckpoints,
    onComplete,
  } = props

  const { exit } = useApp()

  // Combine configured and recent experts
  const allExperts = useMemo(() => {
    const configured = configuredExperts.map((e) => ({ ...e, source: "configured" as const }))
    const recent = recentExperts
      .filter((e) => !configured.some((c) => c.key === e.key))
      .map((e) => ({ ...e, source: "recent" as const }))
    return [...configured, ...recent]
  }, [configuredExperts, recentExperts])

  // Determine initial state
  const getInitialState = (): SelectionState => {
    // If expert and query are both provided, we'll complete immediately (handled in useEffect)
    if (initialExpertKey && !initialQuery) {
      return { type: "enteringQuery", expertKey: initialExpertKey }
    }
    if (showHistory && historyJobs.length > 0) {
      return { type: "browsingHistory", jobs: historyJobs }
    }
    return { type: "browsingExperts", experts: allExperts }
  }

  const [state, dispatch] = useReducer(selectionReducer, undefined, getInitialState)
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<CheckpointHistoryItem | undefined>(
    initialCheckpoint,
  )

  // If both expert and query are provided, complete immediately
  useEffect(() => {
    if (initialExpertKey && initialQuery) {
      onComplete({
        expertKey: initialExpertKey,
        query: initialQuery,
        checkpoint: initialCheckpoint,
      })
    }
  }, [initialExpertKey, initialQuery, initialCheckpoint, onComplete])

  // Text input for query
  const { input: queryInput, handleInput: handleQueryInput } = useTextInput({
    onSubmit: (query) => {
      if (state.type === "enteringQuery" && query.trim()) {
        onComplete({
          expertKey: state.expertKey,
          query: query.trim(),
          checkpoint: selectedCheckpoint,
        })
      }
    },
  })

  useInput(handleQueryInput, { isActive: state.type === "enteringQuery" })

  // Handlers
  const handleExpertSelect = useCallback((expertKey: string) => {
    dispatch({ type: "SELECT_EXPERT", expertKey })
  }, [])

  const handleJobSelect = useCallback(
    async (job: JobHistoryItem) => {
      const checkpoints = await onLoadCheckpoints(job)
      dispatch({ type: "SELECT_JOB", job, checkpoints })
    },
    [onLoadCheckpoints],
  )

  const handleJobResume = useCallback(
    async (job: JobHistoryItem) => {
      const checkpoints = await onLoadCheckpoints(job)
      const latestCheckpoint = checkpoints[0]
      if (latestCheckpoint) {
        setSelectedCheckpoint(latestCheckpoint)
        dispatch({ type: "SELECT_EXPERT", expertKey: job.expertKey })
      }
    },
    [onLoadCheckpoints],
  )

  const handleCheckpointResume = useCallback((checkpoint: CheckpointHistoryItem) => {
    setSelectedCheckpoint(checkpoint)
    // Need to get expertKey from the job - for now use empty and let parent handle
    if (state.type === "browsingCheckpoints") {
      dispatch({ type: "SELECT_EXPERT", expertKey: state.job.expertKey })
    }
  }, [state])

  const handleBack = useCallback(() => {
    if (state.type === "browsingCheckpoints") {
      dispatch({ type: "GO_BACK_FROM_CHECKPOINTS", jobs: historyJobs })
    }
  }, [state, historyJobs])

  const handleSwitchToExperts = useCallback(() => {
    dispatch({ type: "BROWSE_EXPERTS", experts: allExperts })
  }, [allExperts])

  const handleSwitchToHistory = useCallback(() => {
    dispatch({ type: "BROWSE_HISTORY", jobs: historyJobs })
  }, [historyJobs])

  // Handle Ctrl+C to exit
  useInput((input, key) => {
    if (key.ctrl && input === "c") {
      exit()
    }
  })

  // Context for browser components
  const contextValue = useMemo<InputAreaContextValue>(
    () => ({
      onExpertSelect: handleExpertSelect,
      onQuerySubmit: () => {}, // Not used in browser
      onJobSelect: handleJobSelect,
      onJobResume: handleJobResume,
      onCheckpointSelect: () => {}, // Not used in selection (no event browsing)
      onCheckpointResume: handleCheckpointResume,
      onEventSelect: () => {}, // Not used in selection
      onBack: handleBack,
      onSwitchToExperts: handleSwitchToExperts,
      onSwitchToHistory: handleSwitchToHistory,
    }),
    [
      handleExpertSelect,
      handleJobSelect,
      handleJobResume,
      handleCheckpointResume,
      handleBack,
      handleSwitchToExperts,
      handleSwitchToHistory,
    ],
  )

  // If already completed via useEffect, don't render
  if (initialExpertKey && initialQuery) {
    return null
  }

  return (
    <Box flexDirection="column">
      <InputAreaProvider value={contextValue}>
        {(state.type === "browsingHistory" ||
          state.type === "browsingExperts" ||
          state.type === "browsingCheckpoints") && (
          <BrowserRouter
            inputState={state as Parameters<typeof BrowserRouter>[0]["inputState"]}
          />
        )}
      </InputAreaProvider>

      {state.type === "enteringQuery" && (
        <Box flexDirection="column" borderStyle="single" borderColor="gray">
          <Text>
            <Text color="cyan" bold>
              Expert:
            </Text>{" "}
            <Text>{state.expertKey}</Text>
            {selectedCheckpoint && (
              <Text color="gray"> (resuming from step {selectedCheckpoint.stepNumber})</Text>
            )}
          </Text>
          <Box>
            <Text color="gray">Query: </Text>
            <Text>{queryInput}</Text>
            <Text color="cyan">_</Text>
          </Box>
          <Text dimColor>Press Enter to start</Text>
        </Box>
      )}
    </Box>
  )
}

