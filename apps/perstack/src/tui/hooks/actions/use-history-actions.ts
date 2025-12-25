import { useCallback, useState } from "react"
import type {
  BrowsingEventDetailState,
  BrowsingEventsState,
  CheckpointHistoryItem,
  EventHistoryItem,
  ExpertOption,
  InputState,
  JobHistoryItem,
  PerstackEvent,
} from "../../types/index.js"
import { useErrorHandler } from "../core/use-error-handler.js"
import type { InputAction } from "../state/use-input-state.js"

type UseHistoryActionsOptions = {
  allExperts: ExpertOption[]
  historyJobs?: JobHistoryItem[]
  onLoadCheckpoints?: (job: JobHistoryItem) => Promise<CheckpointHistoryItem[]>
  onLoadEvents?: (
    job: JobHistoryItem,
    checkpoint: CheckpointHistoryItem,
  ) => Promise<EventHistoryItem[]>
  onResumeFromCheckpoint?: (checkpoint: CheckpointHistoryItem) => void
  onLoadHistoricalEvents?: (checkpoint: CheckpointHistoryItem) => Promise<PerstackEvent[]>
  appendHistoricalEvents: (events: PerstackEvent[]) => void
  setCurrentStep: (step: number) => void
  setContextWindowUsage: (contextWindowUsage: number) => void
  dispatch: React.Dispatch<InputAction>
  setExpertName: (name: string) => void
  onError?: (error: Error) => void
}
export const useHistoryActions = (options: UseHistoryActionsOptions) => {
  const {
    allExperts,
    historyJobs,
    onLoadCheckpoints,
    onLoadEvents,
    onResumeFromCheckpoint,
    onLoadHistoricalEvents,
    appendHistoricalEvents,
    setCurrentStep,
    setContextWindowUsage,
    dispatch,
    setExpertName,
    onError,
  } = options
  const [selectedJob, setSelectedJob] = useState<JobHistoryItem | null>(null)
  const handleError = useErrorHandler(onError)
  const handleJobSelect = useCallback(
    async (job: JobHistoryItem) => {
      try {
        setSelectedJob(job)
        setExpertName(job.expertKey)
        if (onLoadCheckpoints) {
          const checkpoints = await onLoadCheckpoints(job)
          dispatch({ type: "SELECT_JOB", job, checkpoints })
        }
      } catch (error) {
        handleError(error, "Failed to load checkpoints")
      }
    },
    [onLoadCheckpoints, dispatch, setExpertName, handleError],
  )
  const handleJobResume = useCallback(
    async (job: JobHistoryItem) => {
      try {
        setSelectedJob(job)
        setExpertName(job.expertKey)
        if (onLoadCheckpoints && onResumeFromCheckpoint) {
          const checkpoints = await onLoadCheckpoints(job)
          const latestCheckpoint = checkpoints[0]
          if (latestCheckpoint) {
            if (onLoadHistoricalEvents) {
              const events = await onLoadHistoricalEvents(latestCheckpoint)
              appendHistoricalEvents(events)
            }
            setCurrentStep(latestCheckpoint.stepNumber)
            setContextWindowUsage(latestCheckpoint.contextWindowUsage)
            dispatch({ type: "RESUME_CHECKPOINT", expertKey: job.expertKey })
            onResumeFromCheckpoint(latestCheckpoint)
          }
        }
      } catch (error) {
        handleError(error, "Failed to resume job")
      }
    },
    [
      onLoadCheckpoints,
      onResumeFromCheckpoint,
      onLoadHistoricalEvents,
      appendHistoricalEvents,
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
        if (selectedJob && onLoadEvents) {
          const eventsData = await onLoadEvents(selectedJob, checkpoint)
          dispatch({ type: "SELECT_CHECKPOINT", job: selectedJob, checkpoint, events: eventsData })
        }
      } catch (error) {
        handleError(error, "Failed to load events")
      }
    },
    [selectedJob, onLoadEvents, dispatch, handleError],
  )
  const handleCheckpointResume = useCallback(
    async (checkpoint: CheckpointHistoryItem) => {
      if (onResumeFromCheckpoint) {
        if (onLoadHistoricalEvents) {
          const events = await onLoadHistoricalEvents(checkpoint)
          appendHistoricalEvents(events)
        }
        setCurrentStep(checkpoint.stepNumber)
        setContextWindowUsage(checkpoint.contextWindowUsage)
        dispatch({ type: "RESUME_CHECKPOINT", expertKey: selectedJob?.expertKey || "" })
        onResumeFromCheckpoint(checkpoint)
      }
    },
    [
      onResumeFromCheckpoint,
      onLoadHistoricalEvents,
      appendHistoricalEvents,
      setCurrentStep,
      setContextWindowUsage,
      dispatch,
      selectedJob?.expertKey,
    ],
  )
  const handleBackFromEvents = useCallback(async () => {
    try {
      if (selectedJob && onLoadCheckpoints) {
        const checkpoints = await onLoadCheckpoints(selectedJob)
        dispatch({ type: "GO_BACK_FROM_EVENTS", job: selectedJob, checkpoints })
      }
    } catch (error) {
      handleError(error, "Failed to go back from events")
    }
  }, [selectedJob, onLoadCheckpoints, dispatch, handleError])
  const handleBackFromCheckpoints = useCallback(() => {
    if (historyJobs) {
      setSelectedJob(null)
      dispatch({ type: "GO_BACK_FROM_CHECKPOINTS", historyJobs })
    }
  }, [historyJobs, dispatch])
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
    if (historyJobs) {
      dispatch({ type: "BROWSE_HISTORY", jobs: historyJobs })
    }
  }, [dispatch, historyJobs])
  return {
    selectedJob,
    handleJobSelect,
    handleJobResume,
    handleCheckpointSelect,
    handleCheckpointResume,
    handleEventSelect,
    handleBack,
    handleSwitchToExperts,
    handleSwitchToHistory,
  }
}
