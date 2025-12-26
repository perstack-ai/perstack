import type { CheckpointAction } from "@perstack/core"

/**
 * LogEntry represents a completed action for display.
 * It wraps CheckpointAction with a unique ID for React key purposes.
 *
 * This is derived from RunEvent (state machine transitions) and is accumulated.
 * Each LogEntry represents a step in the Expert's execution history.
 *
 * Supports the daisy chain architecture for parallel delegations:
 * - Within-Run ordering via previousEntryId
 * - Cross-Run ordering via delegatedBy
 */
export type LogEntry = {
  /** Unique identifier for React key */
  id: string
  /** The checkpoint action */
  action: CheckpointAction
  /** Expert key for this entry */
  expertKey: string
  /** Run ID for this entry */
  runId: string
  /** Previous entry ID for daisy chain within the same run */
  previousEntryId?: string
  /** Delegation info if this run was delegated from another */
  delegatedBy?: {
    expertKey: string
    runId: string
  }
}
