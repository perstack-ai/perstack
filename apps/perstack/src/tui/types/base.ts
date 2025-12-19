import type { RunEvent, RuntimeEvent } from "@perstack/core"
export type PerstackEvent = RunEvent | RuntimeEvent
export type LogEntry =
  | { id: string; type: "query"; text: string }
  | {
      id: string
      type: "tool"
      toolName: string
      args: Record<string, unknown>
      result?: Array<{ type: string; text?: string }>
      isSuccess?: boolean
    }
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
  | { id: string; type: "completion"; text: string }
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
  | {
      id: string
      type: "proxy-access"
      action: "allowed" | "blocked"
      domain: string
      port: number
      reason?: string
    }
  | {
      id: string
      type: "error"
      errorName: string
      message: string
      statusCode?: number
    }
export type EventResult = { initialized?: boolean; completed?: boolean; stopped?: boolean }
export type RuntimeInfo = {
  runtimeVersion?: string
  expertName?: string
  model: string
  temperature: number
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
  dockerState?: "building" | "starting" | "running" | "healthy" | "stopped" | "error"
}
export type InitialRuntimeConfig = {
  runtimeVersion: string
  model: string
  temperature: number
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
