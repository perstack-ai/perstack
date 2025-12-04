import { useReducer } from "react"
import { assertNever } from "../../helpers.js"
import type {
  CheckpointHistoryItem,
  EventHistoryItem,
  ExpertOption,
  InputState,
  RunHistoryItem,
} from "../../types/index.js"

type InputAction =
  | { type: "SELECT_EXPERT"; expertKey: string; needsQuery: boolean }
  | { type: "START_RUN" }
  | { type: "END_RUN"; expertName: string; reason: "completed" | "stopped" }
  | { type: "BROWSE_HISTORY"; runs: RunHistoryItem[] }
  | { type: "BROWSE_EXPERTS"; experts: ExpertOption[] }
  | { type: "SELECT_RUN"; run: RunHistoryItem; checkpoints: CheckpointHistoryItem[] }
  | {
      type: "SELECT_CHECKPOINT"
      run: RunHistoryItem
      checkpoint: CheckpointHistoryItem
      events: EventHistoryItem[]
    }
  | { type: "RESUME_CHECKPOINT"; expertKey: string }
  | { type: "GO_BACK_FROM_EVENTS"; run: RunHistoryItem; checkpoints: CheckpointHistoryItem[] }
  | { type: "GO_BACK_FROM_CHECKPOINTS"; historyRuns: RunHistoryItem[] }
  | { type: "INITIALIZE_RUNTIME" }
  | {
      type: "SELECT_EVENT"
      checkpoint: CheckpointHistoryItem
      events: EventHistoryItem[]
      selectedEvent: EventHistoryItem
    }
  | {
      type: "GO_BACK_FROM_EVENT_DETAIL"
      checkpoint: CheckpointHistoryItem
      events: EventHistoryItem[]
    }
const inputReducer = (_state: InputState, action: InputAction): InputState => {
  switch (action.type) {
    case "SELECT_EXPERT":
      if (action.needsQuery) {
        return { type: "enteringQuery", expertName: action.expertKey }
      }
      return { type: "running" }
    case "START_RUN":
    case "INITIALIZE_RUNTIME":
      return { type: "running" }
    case "END_RUN":
      return { type: "enteringQuery", expertName: action.expertName }
    case "BROWSE_HISTORY":
      return { type: "browsingHistory", runs: action.runs }
    case "BROWSE_EXPERTS":
      return { type: "browsingExperts", experts: action.experts }
    case "SELECT_RUN":
      return { type: "browsingCheckpoints", run: action.run, checkpoints: action.checkpoints }
    case "SELECT_CHECKPOINT":
      return {
        type: "browsingEvents",
        checkpoint: action.checkpoint,
        events: action.events,
      }
    case "RESUME_CHECKPOINT":
      return { type: "enteringQuery", expertName: action.expertKey }
    case "GO_BACK_FROM_EVENTS":
      return { type: "browsingCheckpoints", run: action.run, checkpoints: action.checkpoints }
    case "GO_BACK_FROM_CHECKPOINTS":
      return { type: "browsingHistory", runs: action.historyRuns }
    case "SELECT_EVENT":
      return {
        type: "browsingEventDetail",
        checkpoint: action.checkpoint,
        events: action.events,
        selectedEvent: action.selectedEvent,
      }
    case "GO_BACK_FROM_EVENT_DETAIL":
      return {
        type: "browsingEvents",
        checkpoint: action.checkpoint,
        events: action.events,
      }
    default:
      return assertNever(action)
  }
}
type UseInputStateOptions = {
  showHistory?: boolean
  needsQueryInput?: boolean
  initialExpertName?: string
  configuredExperts?: ExpertOption[]
  recentExperts?: ExpertOption[]
  historyRuns?: RunHistoryItem[]
}
const getInitialState = (options: UseInputStateOptions): InputState => {
  if (options.showHistory && options.historyRuns) {
    return { type: "browsingHistory", runs: options.historyRuns }
  }
  if (options.needsQueryInput) {
    return { type: "enteringQuery", expertName: options.initialExpertName || "" }
  }
  return { type: "running" }
}
export const useInputState = (options: UseInputStateOptions) => {
  const [state, dispatch] = useReducer(inputReducer, options, getInitialState)
  return { state, dispatch }
}
export type { InputAction }
