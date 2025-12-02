import { createContext, useContext } from "react"
import type { CheckpointHistoryItem, RunHistoryItem } from "../types/index.js"
export type InputAreaContextValue = {
  onExpertSelect: (expertKey: string) => void
  onQuerySubmit: (query: string) => void
  onRunSelect: (run: RunHistoryItem) => void
  onRunResume: (run: RunHistoryItem) => void
  onCheckpointSelect: (checkpoint: CheckpointHistoryItem) => void
  onCheckpointResume: (checkpoint: CheckpointHistoryItem) => void
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
