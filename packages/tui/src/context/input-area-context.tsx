import React, { createContext, useContext } from "react"
import type {
  BrowsingEventsState,
  CheckpointHistoryItem,
  EventHistoryItem,
  JobHistoryItem,
} from "../types/index.js"
export type InputAreaContextValue = {
  onExpertSelect: (expertKey: string) => void
  onQuerySubmit: (query: string) => void
  onJobSelect: (job: JobHistoryItem) => void
  onJobResume: (job: JobHistoryItem) => void
  onCheckpointSelect: (checkpoint: CheckpointHistoryItem) => void
  onCheckpointResume: (checkpoint: CheckpointHistoryItem) => void
  onEventSelect: (state: BrowsingEventsState, event: EventHistoryItem) => void
  onBack: () => void
  onSwitchToExperts: () => void
  onSwitchToHistory: () => void
}
const InputAreaContext = createContext<InputAreaContextValue | null>(null)
export const InputAreaProvider = InputAreaContext.Provider
export const useInputAreaContext = (): InputAreaContextValue => {
  const context = useContext(InputAreaContext)
  if (!context) {
    throw new Error("useInputAreaContext must be used within InputAreaProvider")
  }
  return context
}
