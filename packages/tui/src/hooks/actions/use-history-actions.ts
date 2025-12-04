import { useCallback, useState } from "react"
import type {
  BrowsingEventDetailState,
  BrowsingEventsState,
  CheckpointHistoryItem,
  EventHistoryItem,
  ExpertOption,
  InputState,
  PerstackEvent,
  RunHistoryItem,
} from "../../types/index.js"
import { useErrorHandler } from "../core/use-error-handler.js"
import type { InputAction } from "../state/use-input-state.js"

type UseHistoryActionsOptions = {
  allExperts: ExpertOption[]
  historyRuns?: RunHistoryItem[]
  onLoadCheckpoints?: (run: RunHistoryItem) => Promise<CheckpointHistoryItem[]>
  onLoadEvents?: (
    run: RunHistoryItem,
    checkpoint: CheckpointHistoryItem,
  ) => Promise<EventHistoryItem[]>
  onResumeFromCheckpoint?: (checkpoint: CheckpointHistoryItem) => void
  onLoadHistoricalEvents?: (checkpoint: CheckpointHistoryItem) => Promise<PerstackEvent[]>
  setHistoricalEvents: (events: PerstackEvent[]) => void
  setCurrentStep: (step: number) => void
  setContextWindowUsage: (contextWindowUsage: number) => void
  dispatch: React.Dispatch<InputAction>
  setExpertName: (name: string) => void
  onError?: (error: Error) => void
}
export const useHistoryActions = (options: UseHistoryActionsOptions) => {
  const {
    allExperts,
    historyRuns,
    onLoadCheckpoints,
    onLoadEvents,
    onResumeFromCheckpoint,
    onLoadHistoricalEvents,
    setHistoricalEvents,
    setCurrentStep,
    setContextWindowUsage,
    dispatch,
    setExpertName,
    onError,
  } = options
  const [selectedRun, setSelectedRun] = useState<RunHistoryItem | null>(null)
  const handleError = useErrorHandler(onError)
  const handleRunSelect = useCallback(
    async (run: RunHistoryItem) => {
      try {
        setSelectedRun(run)
        setExpertName(run.expertKey)
        if (onLoadCheckpoints) {
          const checkpoints = await onLoadCheckpoints(run)
          dispatch({ type: "SELECT_RUN", run, checkpoints })
        }
      } catch (error) {
        handleError(error, "Failed to load checkpoints")
      }
    },
    [onLoadCheckpoints, dispatch, setExpertName, handleError],
  )
  const handleRunResume = useCallback(
    async (run: RunHistoryItem) => {
      try {
        setSelectedRun(run)
        setExpertName(run.expertKey)
        if (onLoadCheckpoints && onResumeFromCheckpoint) {
          const checkpoints = await onLoadCheckpoints(run)
          const latestCheckpoint = checkpoints[0]
          if (latestCheckpoint) {
            if (onLoadHistoricalEvents) {
              const events = await onLoadHistoricalEvents(latestCheckpoint)
              setHistoricalEvents(events)
            }
            setCurrentStep(latestCheckpoint.stepNumber)
            setContextWindowUsage(latestCheckpoint.contextWindowUsage)
            dispatch({ type: "RESUME_CHECKPOINT", expertKey: run.expertKey })
            onResumeFromCheckpoint(latestCheckpoint)
          }
        }
      } catch (error) {
        handleError(error, "Failed to resume run")
      }
    },
    [
      onLoadCheckpoints,
      onResumeFromCheckpoint,
      onLoadHistoricalEvents,
      setHistoricalEvents,
      setCurrentStep,
      setContextWindowUsage,
      dispatch,
      setExpertName,
      handleError,
    ],
  )
  const handleCheckpointSelect = useCallback(
    async (checkpoint: CheckpointHistoryItem) => {
      try {
        if (selectedRun && onLoadEvents) {
          const eventsData = await onLoadEvents(selectedRun, checkpoint)
          dispatch({ type: "SELECT_CHECKPOINT", run: selectedRun, checkpoint, events: eventsData })
        }
      } catch (error) {
        handleError(error, "Failed to load events")
      }
    },
    [selectedRun, onLoadEvents, dispatch, handleError],
  )
  const handleCheckpointResume = useCallback(
    async (checkpoint: CheckpointHistoryItem) => {
      if (onResumeFromCheckpoint) {
        if (onLoadHistoricalEvents) {
          const events = await onLoadHistoricalEvents(checkpoint)
          setHistoricalEvents(events)
        }
        setCurrentStep(checkpoint.stepNumber)
        setContextWindowUsage(checkpoint.contextWindowUsage)
        dispatch({ type: "RESUME_CHECKPOINT", expertKey: selectedRun?.expertKey || "" })
        onResumeFromCheckpoint(checkpoint)
      }
    },
    [
      onResumeFromCheckpoint,
      onLoadHistoricalEvents,
      setHistoricalEvents,
      setCurrentStep,
      setContextWindowUsage,
      dispatch,
      selectedRun?.expertKey,
    ],
  )
  const handleBackFromEvents = useCallback(async () => {
    try {
      if (selectedRun && onLoadCheckpoints) {
        const checkpoints = await onLoadCheckpoints(selectedRun)
        dispatch({ type: "GO_BACK_FROM_EVENTS", run: selectedRun, checkpoints })
      }
    } catch (error) {
      handleError(error, "Failed to go back from events")
    }
  }, [selectedRun, onLoadCheckpoints, dispatch, handleError])
  const handleBackFromCheckpoints = useCallback(() => {
    if (historyRuns) {
      setSelectedRun(null)
      dispatch({ type: "GO_BACK_FROM_CHECKPOINTS", historyRuns })
    }
  }, [historyRuns, dispatch])
  const handleEventSelect = useCallback(
    (state: BrowsingEventsState, event: EventHistoryItem) => {
      dispatch({
        type: "SELECT_EVENT",
        checkpoint: state.checkpoint,
        events: state.events,
        selectedEvent: event,
      })
    },
    [dispatch],
  )
  const handleBackFromEventDetail = useCallback(
    (state: BrowsingEventDetailState) => {
      dispatch({
        type: "GO_BACK_FROM_EVENT_DETAIL",
        checkpoint: state.checkpoint,
        events: state.events,
      })
    },
    [dispatch],
  )
  const handleBack = useCallback(
    (currentState: InputState) => {
      switch (currentState.type) {
        case "browsingEventDetail":
          handleBackFromEventDetail(currentState)
          break
        case "browsingEvents":
          handleBackFromEvents()
          break
        case "browsingCheckpoints":
          handleBackFromCheckpoints()
          break
      }
    },
    [handleBackFromEventDetail, handleBackFromEvents, handleBackFromCheckpoints],
  )
  const handleSwitchToExperts = useCallback(() => {
    dispatch({ type: "BROWSE_EXPERTS", experts: allExperts })
  }, [dispatch, allExperts])
  const handleSwitchToHistory = useCallback(() => {
    if (historyRuns) {
      dispatch({ type: "BROWSE_HISTORY", runs: historyRuns })
    }
  }, [dispatch, historyRuns])
  return {
    selectedRun,
    handleRunSelect,
    handleRunResume,
    handleCheckpointSelect,
    handleCheckpointResume,
    handleEventSelect,
    handleBack,
    handleSwitchToExperts,
    handleSwitchToHistory,
  }
}
