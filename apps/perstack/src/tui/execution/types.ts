import type { PerstackEvent } from "@perstack/core"
import type { InitialRuntimeConfig } from "../types/index.js"

/**
 * Result returned by the execution TUI phase.
 */
export type ExecutionResult = {
  /** Next query to continue with, or null to exit */
  nextQuery: string | null
}

/**
 * Parameters for the execution TUI.
 */
export type ExecutionParams = {
  /** Expert key being executed */
  expertKey: string
  /** Initial query */
  query: string
  /** Runtime configuration */
  config: InitialRuntimeConfig
  /** Timeout for continue input in milliseconds */
  continueTimeoutMs: number
  /** Historical events to display (for resume) */
  historicalEvents?: PerstackEvent[]
}

