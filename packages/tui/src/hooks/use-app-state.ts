import { useCallback, useEffect, useMemo } from "react"
import type { InputAreaContextValue } from "../context/index.js"
import type {
  CheckpointHistoryItem,
  EventHistoryItem,
  ExpertOption,
  InitialRuntimeConfig,
  PerstackEvent,
  RunHistoryItem,
} from "../types/index.js"
import { useExpertActions, useHistoryActions, useRunActions } from "./actions/index.js"
import { useInputState } from "./state/use-input-state.js"
import { useRuntimeInfo } from "./state/use-runtime-info.js"
import { useStepStore } from "./state/use-step-store.js"

type UseAppStateProps = {
  needsQueryInput?: boolean
  showHistory?: boolean
  initialExpertName?: string
  initialQuery?: string
  initialConfig: InitialRuntimeConfig
  configuredExperts?: ExpertOption[]
  recentExperts?: ExpertOption[]
  historyRuns?: RunHistoryItem[]
  onComplete: (expertKey: string, query: string) => void
  onContinue?: (query: string) => void
  onResumeFromCheckpoint?: (checkpoint: CheckpointHistoryItem) => void
  onLoadCheckpoints?: (run: RunHistoryItem) => Promise<CheckpointHistoryItem[]>
  onLoadEvents?: (
    run: RunHistoryItem,
    checkpoint: CheckpointHistoryItem,
  ) => Promise<EventHistoryItem[]>
  onLoadHistoricalEvents?: (checkpoint: CheckpointHistoryItem) => Promise<PerstackEvent[]>
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
    historyRuns,
    onComplete,
    onContinue,
    onResumeFromCheckpoint,
    onLoadCheckpoints,
    onLoadEvents,
    onLoadHistoricalEvents,
    onReady,
  } = props
  const stepStore = useStepStore()
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
    historyRuns,
  })
  const { markAsStarted, handleQuerySubmit } = useRunActions({
    expertName: runtimeInfo.expertName,
    dispatch,
    setQuery,
    onComplete,
    onContinue,
    onReady,
    stepStoreAddEvent: stepStore.addEvent,
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
    historyRuns,
    onLoadCheckpoints,
    onLoadEvents,
    onResumeFromCheckpoint,
    onLoadHistoricalEvents,
    setHistoricalEvents: stepStore.setHistoricalEvents,
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
      onRunSelect: history.handleRunSelect,
      onRunResume: history.handleRunResume,
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
      history.handleRunSelect,
      history.handleRunResume,
      history.handleCheckpointSelect,
      history.handleCheckpointResume,
      history.handleEventSelect,
      handleBack,
      history.handleSwitchToExperts,
      history.handleSwitchToHistory,
    ],
  )
  return {
    stepStore,
    runtimeInfo,
    inputState,
    inputAreaContextValue,
  }
}
