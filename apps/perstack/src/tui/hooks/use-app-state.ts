import { useRun } from "@perstack/react"
import { useCallback, useEffect, useMemo } from "react"
import type { InputAreaContextValue } from "../context/index.js"
import type {
  CheckpointHistoryItem,
  EventHistoryItem,
  ExpertOption,
  InitialRuntimeConfig,
  JobHistoryItem,
  PerstackEvent,
} from "../types/index.js"
import { useExpertActions, useHistoryActions, useRunActions } from "./actions/index.js"
import { useInputState } from "./state/use-input-state.js"
import { useRuntimeInfo } from "./state/use-runtime-info.js"

type UseAppStateProps = {
  needsQueryInput: boolean
  showHistory: boolean
  initialExpertName: string | undefined
  initialQuery: string | undefined
  initialConfig: InitialRuntimeConfig
  configuredExperts: ExpertOption[]
  recentExperts: ExpertOption[]
  historyJobs: JobHistoryItem[]
  onComplete: (expertKey: string, query: string) => void
  onContinue: (query: string) => void
  onResumeFromCheckpoint: (checkpoint: CheckpointHistoryItem) => void
  onLoadCheckpoints: (job: JobHistoryItem) => Promise<CheckpointHistoryItem[]>
  onLoadEvents: (
    job: JobHistoryItem,
    checkpoint: CheckpointHistoryItem,
  ) => Promise<EventHistoryItem[]>
  onLoadHistoricalEvents: (checkpoint: CheckpointHistoryItem) => Promise<PerstackEvent[]>
  onReady: (addEvent: (event: PerstackEvent) => void) => void
}
export const useAppState = (props: UseAppStateProps) => {
  const {
    needsQueryInput,
    showHistory,
    initialExpertName,
    initialQuery,
    initialConfig,
    configuredExperts,
    recentExperts,
    historyJobs,
    onComplete,
    onContinue,
    onResumeFromCheckpoint,
    onLoadCheckpoints,
    onLoadEvents,
    onLoadHistoricalEvents,
    onReady,
  } = props
  const runState = useRun()
  const {
    runtimeInfo,
    handleEvent,
    setExpertName,
    setQuery,
    setCurrentStep,
    setContextWindowUsage,
  } = useRuntimeInfo({ initialExpertName, initialConfig })
  const { state: inputState, dispatch } = useInputState({
    showHistory,
    needsQueryInput,
    initialExpertName,
    configuredExperts,
    recentExperts,
    historyJobs,
  })
  const { markAsStarted, handleQuerySubmit } = useRunActions({
    expertName: runtimeInfo.expertName,
    dispatch,
    setQuery,
    onComplete,
    onContinue,
    onReady,
    stepStoreAddEvent: runState.addEvent,
    handleEvent,
  })
  useEffect(() => {
    if (initialExpertName && initialQuery) {
      setQuery(initialQuery)
      dispatch({ type: "START_RUN" })
      markAsStarted()
      onComplete(initialExpertName, initialQuery)
    }
  }, [markAsStarted, initialExpertName, onComplete, setQuery, initialQuery, dispatch])
  const { allExperts, handleExpertSelect } = useExpertActions({
    needsQueryInput,
    inputState,
    dispatch,
    setExpertName,
    onComplete,
    markAsStarted,
    configuredExperts,
    recentExperts,
  })
  const history = useHistoryActions({
    allExperts,
    historyJobs,
    onLoadCheckpoints,
    onLoadEvents,
    onResumeFromCheckpoint,
    onLoadHistoricalEvents,
    appendHistoricalEvents: runState.appendHistoricalEvents,
    setCurrentStep,
    setContextWindowUsage,
    dispatch,
    setExpertName,
  })
  const handleBack = useCallback(() => {
    history.handleBack(inputState)
  }, [history.handleBack, inputState])
  const inputAreaContextValue = useMemo<InputAreaContextValue>(
    () => ({
      onExpertSelect: handleExpertSelect,
      onQuerySubmit: handleQuerySubmit,
      onJobSelect: history.handleJobSelect,
      onJobResume: history.handleJobResume,
      onCheckpointSelect: history.handleCheckpointSelect,
      onCheckpointResume: history.handleCheckpointResume,
      onEventSelect: history.handleEventSelect,
      onBack: handleBack,
      onSwitchToExperts: history.handleSwitchToExperts,
      onSwitchToHistory: history.handleSwitchToHistory,
    }),
    [
      handleExpertSelect,
      handleQuerySubmit,
      history.handleJobSelect,
      history.handleJobResume,
      history.handleCheckpointSelect,
      history.handleCheckpointResume,
      history.handleEventSelect,
      handleBack,
      history.handleSwitchToExperts,
      history.handleSwitchToHistory,
    ],
  )
  return {
    runState,
    runtimeInfo,
    inputState,
    inputAreaContextValue,
  }
}
