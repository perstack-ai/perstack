import type { CheckpointAction } from "@perstack/core"

/**
 * LogEntry represents a completed action for display.
 * It wraps CheckpointAction with a unique ID for React key purposes.
 *
 * This is derived from RunEvent (state machine transitions) and is accumulated.
 * Each LogEntry represents a step in the Expert's execution history.
 */
export type LogEntry = {
  /** Unique identifier for React key */
  id: string
  /** The checkpoint action */
  action: CheckpointAction
}
