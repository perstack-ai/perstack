import { createId } from "@paralleldrive/cuid2"
import { z } from "zod"
import {
  defaultMaxRetries,
  defaultMaxSteps,
  defaultPerstackApiBaseUrl,
  defaultTimeout,
  expertKeyRegex,
} from "../constants/constants.js"
import type { Checkpoint } from "./checkpoint.js"
import { checkpointSchema } from "./checkpoint.js"
import type { Expert } from "./expert.js"
import { expertSchema } from "./expert.js"
import type {
  ExpertMessage,
  InstructionMessage,
  Message,
  ToolMessage,
  UserMessage,
} from "./message.js"
import type { PerstackConfigSkill, ReasoningBudget } from "./perstack-toml.js"
import { defaultReasoningBudget, reasoningBudgetSchema } from "./perstack-toml.js"
import type { ProviderConfig } from "./provider-config.js"
import { providerConfigSchema } from "./provider-config.js"
import type { Step } from "./step.js"
import type { ToolCall } from "./tool-call.js"
import type { ToolResult } from "./tool-result.js"
import type { Usage } from "./usage.js"

/** Parse an expert key into its components */
export function parseExpertKey(expertKey: string): {
  key: string
  name: string
  version?: string
  tag?: string
} {
  const match = expertKey.match(expertKeyRegex)
  if (!match) {
    throw new Error(`Invalid expert key format: ${expertKey}`)
  }
  const [key, name, version, tag] = match
  if (!name) {
    throw new Error(`Invalid expert key format: ${expertKey}`)
  }
  return { key, name, version, tag }
}

/** Input for a run (text or interactive tool call result) */
export interface RunInput {
  /** Text query */
  text?: string
  /** Interactive tool call result (when continuing from interactive tool) */
  interactiveToolCallResult?: {
    toolCallId: string
    toolName: string
    skillName: string
    text: string
  }
}

/** Runtime settings for an Expert run */
export interface RunSetting {
  /** Model name to use */
  model: string
  /** Provider configuration */
  providerConfig: ProviderConfig
  /** Job ID this run belongs to */
  jobId: string
  /** Unique run identifier */
  runId: string
  /** Expert key to run */
  expertKey: string
  /** Input for the run */
  input: RunInput
  /** Map of expert keys to Expert definitions */
  experts: Record<string, Expert>
  /** Reasoning budget for native LLM reasoning (extended thinking). Defaults to "low". Use "none" or 0 to disable. */
  reasoningBudget: ReasoningBudget
  /** Maximum steps before stopping (applies to Job's totalSteps) */
  maxSteps: number
  /** Maximum retries on generation failure */
  maxRetries: number
  /** Timeout per generation in milliseconds */
  timeout: number
  /** Unix timestamp when run started */
  startedAt: number
  /** Unix timestamp of last update */
  updatedAt: number
  /** Perstack API base URL */
  perstackApiBaseUrl: string
  /** Perstack API key */
  perstackApiKey?: string
  /** Custom command for @perstack/base */
  perstackBaseSkillCommand?: string[]
  /** Environment variables to pass to skills */
  env: Record<string, string>
  /** HTTP proxy URL for API requests */
  proxyUrl?: string
  /** Enable verbose output for build processes */
  verbose?: boolean
}

/** Parameters for starting a run */
export interface RunParams {
  /** Run settings */
  setting: RunSetting
  /** Optional checkpoint to resume from */
  checkpoint?: Checkpoint
}

/** Expert input type before schema transformation (skills without name, optional fields) */
type ExpertInput = {
  name: string
  version: string
  description?: string
  instruction: string
  skills?: Record<string, PerstackConfigSkill>
  delegates?: string[]
  tags?: string[]
}

/** Input type for runParamsSchema (before defaults/transforms) */
export type RunParamsInput = {
  setting: {
    model: string
    providerConfig: ProviderConfig
    jobId?: string
    // runId is generated internally, not accepted from external input
    expertKey: string
    input: RunInput
    experts?: Record<string, ExpertInput>
    reasoningBudget?: ReasoningBudget
    maxSteps?: number
    maxRetries?: number
    timeout?: number
    startedAt?: number
    updatedAt?: number
    perstackApiBaseUrl?: string
    perstackApiKey?: string
    perstackBaseSkillCommand?: string[]
    env?: Record<string, string>
    proxyUrl?: string
    verbose?: boolean
  }
  checkpoint?: Checkpoint
}

export const runSettingSchema = z.object({
  model: z.string(),
  providerConfig: providerConfigSchema,
  jobId: z.string(),
  runId: z.string(),
  expertKey: z.string().min(1).regex(expertKeyRegex),
  input: z.object({
    text: z.string().optional(),
    interactiveToolCallResult: z
      .object({
        toolCallId: z.string(),
        toolName: z.string(),
        skillName: z.string(),
        text: z.string(),
      })
      .optional(),
  }),
  experts: z.record(z.string(), expertSchema),
  reasoningBudget: reasoningBudgetSchema.default(defaultReasoningBudget),
  maxSteps: z.number().min(1).optional().default(defaultMaxSteps),
  maxRetries: z.number().min(0),
  timeout: z.number().min(0),
  startedAt: z.number(),
  updatedAt: z.number(),
  perstackApiBaseUrl: z.string().url(),
  perstackApiKey: z.string().optional(),
  perstackBaseSkillCommand: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()),
  proxyUrl: z.string().optional(),
  verbose: z.boolean().optional(),
})

export const runParamsSchema = z.object({
  setting: z.object({
    model: z.string(),
    providerConfig: providerConfigSchema,
    jobId: z
      .string()
      .optional()
      .default(() => createId()),
    runId: z
      .string()
      .optional()
      .default(() => createId()),
    expertKey: z.string().min(1).regex(expertKeyRegex),
    input: z.object({
      text: z.string().optional(),
      interactiveToolCallResult: z
        .object({
          toolCallId: z.string(),
          toolName: z.string(),
          skillName: z.string(),
          text: z.string(),
        })
        .optional(),
    }),
    experts: z
      .record(z.string().min(1).regex(expertKeyRegex), expertSchema.omit({ key: true }))
      .optional()
      .default({})
      .transform((experts) =>
        Object.fromEntries(
          Object.entries(experts).map(([key, expertWithoutKey]) => [
            key,
            expertSchema.parse({
              ...expertWithoutKey,
              key,
            }),
          ]),
        ),
      ),
    reasoningBudget: reasoningBudgetSchema.optional().default(defaultReasoningBudget),
    maxSteps: z.number().min(1).optional().default(defaultMaxSteps),
    maxRetries: z.number().min(0).optional().default(defaultMaxRetries),
    timeout: z.number().min(0).optional().default(defaultTimeout),
    startedAt: z.number().optional().default(Date.now()),
    updatedAt: z.number().optional().default(Date.now()),
    perstackApiBaseUrl: z.url().optional().default(defaultPerstackApiBaseUrl),
    perstackApiKey: z.string().optional(),
    perstackBaseSkillCommand: z.array(z.string()).optional(),
    env: z.record(z.string(), z.string()).optional().default({}),
    proxyUrl: z.string().optional(),
    verbose: z.boolean().optional(),
  }),
  checkpoint: checkpointSchema.optional(),
})

/**
 * Expert state events - state machine transitions during execution.
 * All events contain deeply serializable properties for checkpoint storage.
 */
type ExpertStatePayloads = {
  startRun: {
    initialCheckpoint: Checkpoint
    inputMessages: (InstructionMessage | UserMessage | ToolMessage)[]
  }
  startGeneration: {
    messages: Message[]
  }
  retry: {
    reason: string
    newMessages: (UserMessage | ExpertMessage | ToolMessage)[]
    toolCalls?: ToolCall[]
    toolResults?: ToolResult[]
    usage: Usage
  }
  callTools: {
    newMessage: ExpertMessage
    toolCalls: ToolCall[]
    usage: Usage
  }
  callInteractiveTool: {
    newMessage: ExpertMessage
    toolCall: ToolCall
    usage: Usage
  }
  callDelegate: {
    newMessage: ExpertMessage
    toolCalls: ToolCall[]
    usage: Usage
  }
  resolveToolResults: {
    toolResults: ToolResult[]
  }
  attemptCompletion: {
    toolResult: ToolResult
  }
  finishToolCall: {
    newMessages: (UserMessage | ToolMessage)[]
  }
  resumeToolCalls: {
    pendingToolCalls: ToolCall[]
    partialToolResults: ToolResult[]
  }
  finishAllToolCalls: {
    newMessages: (UserMessage | ToolMessage)[]
  }
  continueToNextStep: {
    checkpoint: Checkpoint
    step: Step
    nextCheckpoint: Checkpoint
  }
  stopRunByInteractiveTool: {
    checkpoint: Checkpoint
    step: Step
  }
  stopRunByDelegate: {
    checkpoint: Checkpoint
    step: Step
  }
  stopRunByExceededMaxSteps: {
    checkpoint: Checkpoint
    step: Step
  }
  stopRunByError: {
    checkpoint: Checkpoint
    step: Step
    error: {
      name: string
      message: string
      statusCode?: number
      isRetryable: boolean
    }
  }
  completeRun: {
    checkpoint: Checkpoint
    step: Step
    text: string
    usage: Usage
  }
}

/**
 * Streaming events - reasoning/result streaming during LLM generation.
 * Moved from RuntimeEvent to RunEvent to support proper attribution in parallel runs.
 */
type StreamingPayloads = {
  /** Start of reasoning stream (display hint) */
  startStreamingReasoning: object
  /** Streaming reasoning delta */
  streamReasoning: {
    delta: string
  }
  /** Reasoning stream completion (extended thinking / test-time scaling) */
  completeStreamingReasoning: {
    text: string
  }
  /** Start of run result stream (display hint) */
  startStreamingRunResult: object
  /** Streaming run result delta */
  streamRunResult: {
    delta: string
  }
  /** Run result stream completion */
  completeStreamingRunResult: {
    text: string
  }
}

/** Base properties for all run events (both state and streaming) */
export interface BaseEvent {
  /** Unique event ID */
  id: string
  /** Expert key that emitted this event */
  expertKey: string
  /** Unix timestamp when event was emitted */
  timestamp: number
  /** Job ID this event belongs to */
  jobId: string
  /** Run ID this event belongs to */
  runId: string
  /** Step number when event was emitted */
  stepNumber: number
}

/** Expert state event types (state machine transitions) */
export type ExpertStateEventType = keyof ExpertStatePayloads

/** Streaming event types */
export type StreamingEventType = keyof StreamingPayloads

/** All run event types (state + streaming) */
export type EventType = ExpertStateEventType | StreamingEventType

/** Union type of expert state events */
export type ExpertStateEvent = {
  [K in ExpertStateEventType]: BaseEvent & { type: K } & ExpertStatePayloads[K]
}[ExpertStateEventType]

/** Union type of streaming events */
export type StreamingEvent = {
  [K in StreamingEventType]: BaseEvent & { type: K } & StreamingPayloads[K]
}[StreamingEventType]

/** Union type of all run events (state machine + streaming) */
export type RunEvent = ExpertStateEvent | StreamingEvent

/** Extract a specific event type */
export type EventForType<T extends EventType> = Extract<RunEvent, { type: T }>

/** Factory function to create expert state events */
export function createEvent<T extends ExpertStateEventType>(type: T) {
  return (
    setting: RunSetting,
    checkpoint: Checkpoint,
    data: Omit<
      Extract<ExpertStateEvent, { type: T }>,
      "type" | "id" | "expertKey" | "timestamp" | "jobId" | "runId" | "stepNumber"
    >,
  ): Extract<ExpertStateEvent, { type: T }> => {
    return {
      type,
      id: createId(),
      expertKey: checkpoint.expert.key,
      timestamp: Date.now(),
      jobId: setting.jobId,
      runId: setting.runId,
      stepNumber: checkpoint.stepNumber,
      ...data,
    } as Extract<ExpertStateEvent, { type: T }>
  }
}

/** Factory function to create streaming events */
export function createStreamingEvent<T extends StreamingEventType>(
  type: T,
  setting: RunSetting,
  checkpoint: Checkpoint,
  data: Omit<
    Extract<StreamingEvent, { type: T }>,
    "type" | "id" | "expertKey" | "timestamp" | "jobId" | "runId" | "stepNumber"
  >,
): Extract<StreamingEvent, { type: T }> {
  return {
    type,
    id: createId(),
    expertKey: checkpoint.expert.key,
    timestamp: Date.now(),
    jobId: setting.jobId,
    runId: setting.runId,
    stepNumber: checkpoint.stepNumber,
    ...data,
  } as Extract<StreamingEvent, { type: T }>
}

export const startRun = createEvent("startRun")
export const startGeneration = createEvent("startGeneration")
export const retry = createEvent("retry")
export const callTools = createEvent("callTools")
export const callInteractiveTool = createEvent("callInteractiveTool")
export const callDelegate = createEvent("callDelegate")
export const resolveToolResults = createEvent("resolveToolResults")
export const attemptCompletion = createEvent("attemptCompletion")
export const finishToolCall = createEvent("finishToolCall")
export const resumeToolCalls = createEvent("resumeToolCalls")
export const finishAllToolCalls = createEvent("finishAllToolCalls")
export const completeRun = createEvent("completeRun")
export const stopRunByInteractiveTool = createEvent("stopRunByInteractiveTool")
export const stopRunByDelegate = createEvent("stopRunByDelegate")
export const stopRunByExceededMaxSteps = createEvent("stopRunByExceededMaxSteps")
export const stopRunByError = createEvent("stopRunByError")
export const continueToNextStep = createEvent("continueToNextStep")

/** Base properties for runtime events (infrastructure-level, no expertKey) */
interface BaseRuntimeEvent {
  /** Unique event ID */
  id: string
  /** Unix timestamp */
  timestamp: number
  /** Job ID */
  jobId: string
  /** Run ID */
  runId: string
}

/** Runtime event payloads (infrastructure-level events only) */
type RuntimeEventPayloads = {
  initializeRuntime: {
    runtimeVersion: string
    runtime?: string
    expertName: string
    experts: string[]
    model: string
    maxSteps?: number
    maxRetries: number
    timeout: number
    query?: string
    interactiveToolCall?: {
      toolName: string
      toolCallId: string
      text: string
    }
  }
  skillStarting: {
    skillName: string
    command: string
    args: string[]
  }
  skillConnected: {
    skillName: string
    serverInfo?: {
      name: string
      version: string
    }
    connectDurationMs?: number
    totalDurationMs?: number
    spawnDurationMs?: number
    handshakeDurationMs?: number
    toolDiscoveryDurationMs?: number
  }
  skillStderr: {
    skillName: string
    message: string
  }
  skillDisconnected: {
    skillName: string
  }
  /** Docker build progress event */
  dockerBuildProgress: {
    stage: "pulling" | "building" | "complete" | "error"
    service: string
    message: string
    progress?: number
  }
  /** Docker container status event */
  dockerContainerStatus: {
    status: "starting" | "running" | "healthy" | "unhealthy" | "stopped" | "error"
    service: string
    message?: string
  }
  /** Proxy access event (allow/block) */
  proxyAccess: {
    action: "allowed" | "blocked"
    domain: string
    port: number
    reason?: string
  }
}

/** All runtime event types */
export type RuntimeEventType = keyof RuntimeEventPayloads

/** Union type of all runtime events */
export type RuntimeEvent = {
  [K in RuntimeEventType]: BaseRuntimeEvent & { type: K } & RuntimeEventPayloads[K]
}[RuntimeEventType]

/** Extract a specific runtime event type */
export type RuntimeEventForType<T extends RuntimeEventType> = Extract<RuntimeEvent, { type: T }>

/** Factory function to create runtime events */
export function createRuntimeEvent<T extends RuntimeEventType>(
  type: T,
  jobId: string,
  runId: string,
  data: Omit<RuntimeEventForType<T>, "type" | "id" | "timestamp" | "jobId" | "runId">,
): RuntimeEventForType<T> {
  return {
    type,
    id: createId(),
    timestamp: Date.now(),
    jobId,
    runId,
    ...data,
  } as RuntimeEventForType<T>
}

/** Union of all Perstack events (RunEvent for state machine, RuntimeEvent for environment) */
export type PerstackEvent = RunEvent | RuntimeEvent
