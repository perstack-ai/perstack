import type { CheckpointAction, RunEvent, RuntimeEvent } from "@perstack/core"
export type PerstackEvent = RunEvent | RuntimeEvent

/**
 * ActionEntry represents a completed action for display in the TUI.
 * Uses CheckpointAction for tool/completion actions, with TUI-specific entries
 * for queries, delegations, and infrastructure events.
 */
export type ActionEntry =
  // User query at the start of a run
  | { id: string; type: "query"; text: string }
  // CheckpointAction-based entries (tools, completion, retry, etc.)
  | { id: string; type: "action"; action: CheckpointAction }
  // Delegation lifecycle events
  | {
      id: string
      type: "delegation-started"
      expertName: string
      runtime: string
      version: string
      query?: string
    }
  | {
      id: string
      type: "delegation-completed"
      expertName: string
      runtime: string
      version: string
      result?: string
    }
  // Docker infrastructure events
  | {
      id: string
      type: "docker-build"
      stage: "pulling" | "building" | "complete" | "error"
      service: string
      message: string
      progress?: number
    }
  | {
      id: string
      type: "docker-container"
      status: "starting" | "running" | "healthy" | "unhealthy" | "stopped" | "error"
      service: string
      message?: string
    }
  // Proxy access events
  | {
      id: string
      type: "proxy-access"
      action: "allowed" | "blocked"
      domain: string
      port: number
      reason?: string
    }
  // Error events (run stopped by error)
  | {
      id: string
      type: "error"
      errorName: string
      message: string
      statusCode?: number
    }

/**
 * Streaming state for real-time display (NOT for Static component).
 * This state is cleared when streaming completes and content moves to ActionEntry.
 */
export type StreamingState = {
  /** Accumulated reasoning text during extended thinking */
  reasoning?: string
  /** Accumulated result text during run result generation */
  text?: string
  /** Whether reasoning is currently streaming */
  isReasoningActive?: boolean
  /** Whether result text is currently streaming */
  isTextActive?: boolean
}

/** @deprecated Use ActionEntry instead */
export type LogEntry = ActionEntry
export type EventResult = { initialized?: boolean; completed?: boolean; stopped?: boolean }
export type RuntimeInfo = {
  runtimeVersion?: string
  expertName?: string
  model: string
  currentStep?: number
  maxSteps?: number
  maxRetries: number
  timeout: number
  status: "initializing" | "running" | "completed" | "stopped"
  query?: string
  statusChangedAt?: number
  activeSkills: string[]
  contextWindowUsage: number
  runtime?: string
  streamingText?: string
  /** Accumulated streaming reasoning text (extended thinking) */
  streamingReasoning?: string
  dockerState?: "building" | "starting" | "running" | "healthy" | "stopped" | "error"
}
export type InitialRuntimeConfig = {
  runtimeVersion: string
  model: string
  maxSteps?: number
  maxRetries: number
  timeout: number
  contextWindowUsage: number
  runtime?: string
}
export type ExpertOption = {
  key: string
  name: string
  lastUsed?: number
  source?: "configured" | "recent"
}
export type RunHistoryItem = {
  jobId: string
  runId: string
  expertKey: string
  model: string
  inputText: string
  startedAt: number
  updatedAt: number
}
export type JobHistoryItem = {
  jobId: string
  status: string
  expertKey: string
  totalSteps: number
  startedAt: number
  finishedAt?: number
}
export type CheckpointHistoryItem = {
  id: string
  jobId: string
  runId: string
  stepNumber: number
  contextWindowUsage: number
}
export type EventHistoryItem = {
  id: string
  jobId: string
  runId: string
  stepNumber: number
  type: string
  timestamp: number
}
