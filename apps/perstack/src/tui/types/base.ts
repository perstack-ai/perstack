export type { Activity, PerstackEvent } from "@perstack/core"
export type { RuntimeState, StreamingState } from "@perstack/react"

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
