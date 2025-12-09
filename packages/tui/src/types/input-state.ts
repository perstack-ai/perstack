import type {
  CheckpointHistoryItem,
  EventHistoryItem,
  ExpertOption,
  JobHistoryItem,
} from "./base.js"

export type EnteringQueryState = {
  type: "enteringQuery"
  expertName: string
}
export type RunningState = {
  type: "running"
}
export type BrowsingHistoryState = {
  type: "browsingHistory"
  jobs: JobHistoryItem[]
}
export type BrowsingExpertsState = {
  type: "browsingExperts"
  experts: ExpertOption[]
}
export type BrowsingCheckpointsState = {
  type: "browsingCheckpoints"
  job: JobHistoryItem
  checkpoints: CheckpointHistoryItem[]
}
export type BrowsingEventsState = {
  type: "browsingEvents"
  checkpoint: CheckpointHistoryItem
  events: EventHistoryItem[]
}
export type BrowsingEventDetailState = {
  type: "browsingEventDetail"
  checkpoint: CheckpointHistoryItem
  events: EventHistoryItem[]
  selectedEvent: EventHistoryItem
}
export type InputState =
  | EnteringQueryState
  | RunningState
  | BrowsingHistoryState
  | BrowsingExpertsState
  | BrowsingCheckpointsState
  | BrowsingEventsState
  | BrowsingEventDetailState
