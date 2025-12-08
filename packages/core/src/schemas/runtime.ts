import { createId } from "@paralleldrive/cuid2"
import { z } from "zod"
import {
  defaultMaxRetries,
  defaultPerstackApiBaseUrl,
  defaultTemperature,
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
import type { PerstackConfigSkill } from "./perstack-toml.js"
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
    text: string
  }
}

/** Runtime settings for an Expert run */
export interface RunSetting {
  /** Model name to use */
  model: string
  /** Provider configuration */
  providerConfig: ProviderConfig
  /** Unique run identifier */
  runId: string
  /** Expert key to run */
  expertKey: string
  /** Input for the run */
  input: RunInput
  /** Map of expert keys to Expert definitions */
  experts: Record<string, Expert>
  /** Temperature for generation (0-1) */
  temperature: number
  /** Maximum steps before stopping */
  maxSteps?: number
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
    runId?: string
    expertKey: string
    input: RunInput
    experts?: Record<string, ExpertInput>
    temperature?: number
    maxSteps?: number
    maxRetries?: number
    timeout?: number
    startedAt?: number
    updatedAt?: number
    perstackApiBaseUrl?: string
    perstackApiKey?: string
    perstackBaseSkillCommand?: string[]
    env?: Record<string, string>
  }
  checkpoint?: Checkpoint
}

export const runSettingSchema = z.object({
  model: z.string(),
  providerConfig: providerConfigSchema,
  runId: z.string(),
  expertKey: z.string().min(1).regex(expertKeyRegex),
  input: z.object({
    text: z.string().optional(),
    interactiveToolCallResult: z
      .object({
        toolCallId: z.string(),
        toolName: z.string(),
        text: z.string(),
      })
      .optional(),
  }),
  experts: z.record(z.string(), expertSchema),
  temperature: z.number().min(0).max(1),
  maxSteps: z.number().min(1).optional(),
  maxRetries: z.number().min(0),
  timeout: z.number().min(0),
  startedAt: z.number(),
  updatedAt: z.number(),
  perstackApiBaseUrl: z.string().url(),
  perstackApiKey: z.string().optional(),
  perstackBaseSkillCommand: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()),
})

export const runParamsSchema = z.object({
  setting: z.object({
    model: z.string(),
    providerConfig: providerConfigSchema,
    runId: z.string().optional().default(createId()),
    expertKey: z.string().min(1).regex(expertKeyRegex),
    input: z.object({
      text: z.string().optional(),
      interactiveToolCallResult: z
        .object({
          toolCallId: z.string(),
          toolName: z.string(),
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
    temperature: z.number().min(0).max(1).optional().default(defaultTemperature),
    maxSteps: z.number().min(1).optional(),
    maxRetries: z.number().min(0).optional().default(defaultMaxRetries),
    timeout: z.number().min(0).optional().default(defaultTimeout),
    startedAt: z.number().optional().default(Date.now()),
    updatedAt: z.number().optional().default(Date.now()),
    perstackApiBaseUrl: z.url().optional().default(defaultPerstackApiBaseUrl),
    perstackApiKey: z.string().optional(),
    perstackBaseSkillCommand: z.array(z.string()).optional(),
    env: z.record(z.string(), z.string()).optional().default({}),
  }),
  checkpoint: checkpointSchema.optional(),
})

/**
 * Expert run events - emitted during execution for observability.
 * All events contain deeply serializable properties for checkpoint storage.
 */
type ExpertEventPayloads = {
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
    toolCall: ToolCall
    usage: Usage
  }
  resolveToolResults: {
    toolResults: ToolResult[]
  }
  resolveThought: {
    toolResult: ToolResult
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
  completeRun: {
    checkpoint: Checkpoint
    step: Step
    text: string
    usage: Usage
  }
}

/** Base properties for all run events */
export interface BaseEvent {
  /** Unique event ID */
  id: string
  /** Expert key that emitted this event */
  expertKey: string
  /** Unix timestamp when event was emitted */
  timestamp: number
  /** Run ID this event belongs to */
  runId: string
  /** Step number when event was emitted */
  stepNumber: number
}

/** All possible event types */
export type EventType = keyof ExpertEventPayloads

/** Union type of all run events */
export type RunEvent = {
  [K in EventType]: BaseEvent & { type: K } & ExpertEventPayloads[K]
}[EventType]

/** Extract a specific event type */
export type EventForType<T extends EventType> = Extract<RunEvent, { type: T }>

/** Factory function to create typed events */
export function createEvent<T extends EventType>(type: T) {
  return (
    setting: RunSetting,
    checkpoint: Checkpoint,
    data: Omit<EventForType<T>, "type" | "id" | "expertKey" | "timestamp" | "runId" | "stepNumber">,
  ): EventForType<T> => {
    return {
      type,
      id: createId(),
      expertKey: checkpoint.expert.key,
      timestamp: Date.now(),
      runId: setting.runId,
      stepNumber: checkpoint.stepNumber,
      ...data,
    } as EventForType<T>
  }
}

export const startRun = createEvent("startRun")
export const startGeneration = createEvent("startGeneration")
export const retry = createEvent("retry")
export const callTools = createEvent("callTools")
export const callInteractiveTool = createEvent("callInteractiveTool")
export const callDelegate = createEvent("callDelegate")
export const resolveToolResults = createEvent("resolveToolResults")
export const resolveThought = createEvent("resolveThought")
export const attemptCompletion = createEvent("attemptCompletion")
export const finishToolCall = createEvent("finishToolCall")
export const resumeToolCalls = createEvent("resumeToolCalls")
export const finishAllToolCalls = createEvent("finishAllToolCalls")
export const completeRun = createEvent("completeRun")
export const stopRunByInteractiveTool = createEvent("stopRunByInteractiveTool")
export const stopRunByDelegate = createEvent("stopRunByDelegate")
export const stopRunByExceededMaxSteps = createEvent("stopRunByExceededMaxSteps")
export const continueToNextStep = createEvent("continueToNextStep")

/** Base properties for runtime events */
interface BaseRuntimeEvent {
  /** Unique event ID */
  id: string
  /** Unix timestamp */
  timestamp: number
  /** Run ID */
  runId: string
}

/** Runtime event payloads (infrastructure-level events) */
type RuntimeEventPayloads = {
  initializeRuntime: {
    runtimeVersion: string
    expertName: string
    experts: string[]
    model: string
    temperature: number
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
  }
  skillStderr: {
    skillName: string
    message: string
  }
  skillDisconnected: {
    skillName: string
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
  runId: string,
  data: Omit<RuntimeEventForType<T>, "type" | "id" | "timestamp" | "runId">,
): RuntimeEventForType<T> {
  return {
    type,
    id: createId(),
    timestamp: Date.now(),
    runId,
    ...data,
  } as RuntimeEventForType<T>
}
