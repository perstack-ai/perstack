import type {
  CheckpointHistoryItem,
  EventHistoryItem,
  ExpertOption,
  RunHistoryItem,
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
  runs: RunHistoryItem[]
}
export type BrowsingExpertsState = {
  type: "browsingExperts"
  experts: ExpertOption[]
}
export type BrowsingCheckpointsState = {
  type: "browsingCheckpoints"
  run: RunHistoryItem
  checkpoints: CheckpointHistoryItem[]
}
export type BrowsingEventsState = {
  type: "browsingEvents"
  checkpoint: CheckpointHistoryItem
  events: EventHistoryItem[]
}
export type InputState =
  | EnteringQueryState
  | RunningState
  | BrowsingHistoryState
  | BrowsingExpertsState
  | BrowsingCheckpointsState
  | BrowsingEventsState
