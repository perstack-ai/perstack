import type { CheckpointHistoryItem, ExpertOption, JobHistoryItem } from "../types/index.js"

/**
 * Result returned by the selection TUI phase.
 * Contains all information needed to start a run.
 */
export type SelectionResult = {
  expertKey: string
  query: string
  checkpoint: CheckpointHistoryItem | undefined
}

/**
 * Parameters for the selection TUI.
 */
export type SelectionParams = {
  /** Whether to show history browser */
  showHistory: boolean
  /** Pre-selected expert key (skip expert selection if provided with query) */
  initialExpertKey: string | undefined
  /** Pre-filled query (skip query input if provided with expert) */
  initialQuery: string | undefined
  /** Pre-selected checkpoint for resume */
  initialCheckpoint: CheckpointHistoryItem | undefined
  /** Experts from perstack.toml */
  configuredExperts: ExpertOption[]
  /** Recently used experts */
  recentExperts: ExpertOption[]
  /** Job history for browsing */
  historyJobs: JobHistoryItem[]
  /** Callback to load checkpoints for a job */
  onLoadCheckpoints: (job: JobHistoryItem) => Promise<CheckpointHistoryItem[]>
}

