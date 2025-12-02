import { createId } from "@paralleldrive/cuid2"
import { z } from "zod"
import {
  defaultMaxRetries,
  defaultPerstackApiBaseUrl,
  defaultTemperature,
  defaultTimeout,
  expertKeyRegex,
} from "../constants/constants.js"
import { type Checkpoint, checkpointSchema } from "./checkpoint.js"
import { expertSchema } from "./expert.js"
import type {
  ExpertMessage,
  InstructionMessage,
  Message,
  ToolMessage,
  UserMessage,
} from "./message.js"
import { providerConfigSchema } from "./provider-config.js"
import type { Step } from "./step.js"
import type { ToolCall } from "./tool-call.js"
import type { ToolResult } from "./tool-result.js"
import type { Usage } from "./usage.js"

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
    workspace: z.string().optional(),
    startedAt: z.number().optional().default(Date.now()),
    updatedAt: z.number().optional().default(Date.now()),
    perstackApiBaseUrl: z.url().optional().default(defaultPerstackApiBaseUrl),
    perstackApiKey: z.string().optional(),
    perstackBaseSkillCommand: z.array(z.string()).optional(),
    env: z.record(z.string(), z.string()).optional().default({}),
  }),
  checkpoint: checkpointSchema.optional(),
})
export type RunParamsInput = z.input<typeof runParamsSchema>
export type RunParams = z.output<typeof runParamsSchema>
export type RunSetting = z.infer<typeof runParamsSchema.shape.setting>
export type RunInput = z.infer<typeof runParamsSchema.shape.setting.shape.input>

/**
 * ExpertEvents can only contain deeply serializable properties.
 * This is important because these events are serialized using JSON.stringify() and stored in Cassandra,
 * and later used to restore state when resuming execution. Non-serializable properties would cause
 * issues during serialization/deserialization process.
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
    toolCall?: ToolCall
    toolResult?: ToolResult
    usage: Usage
  }
  callTool: {
    newMessage: ExpertMessage
    toolCall: ToolCall
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
  resolveToolResult: {
    toolResult: ToolResult
  }
  resolveThought: {
    toolResult: ToolResult
  }
  resolvePdfFile: {
    toolResult: ToolResult
  }
  resolveImageFile: {
    toolResult: ToolResult
  }
  attemptCompletion: {
    toolResult: ToolResult
  }
  finishToolCall: {
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

type BaseEvent = {
  id: string
  expertKey: string
  timestamp: number
  runId: string
  stepNumber: number
}
export type EventType = keyof ExpertEventPayloads
export type RunEvent = {
  [K in EventType]: BaseEvent & { type: K } & ExpertEventPayloads[K]
}[EventType]
export type EventForType<T extends EventType> = Extract<RunEvent, { type: T }>

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
export const callTool = createEvent("callTool")
export const callInteractiveTool = createEvent("callInteractiveTool")
export const callDelegate = createEvent("callDelegate")
export const resolveToolResult = createEvent("resolveToolResult")
export const resolveThought = createEvent("resolveThought")
export const resolvePdfFile = createEvent("resolvePdfFile")
export const resolveImageFile = createEvent("resolveImageFile")
export const attemptCompletion = createEvent("attemptCompletion")
export const finishToolCall = createEvent("finishToolCall")
export const completeRun = createEvent("completeRun")
export const stopRunByInteractiveTool = createEvent("stopRunByInteractiveTool")
export const stopRunByDelegate = createEvent("stopRunByDelegate")
export const stopRunByExceededMaxSteps = createEvent("stopRunByExceededMaxSteps")
export const continueToNextStep = createEvent("continueToNextStep")

type BaseRuntimeEvent = {
  id: string
  timestamp: number
  runId: string
}
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
  skillConnected: {
    skillName: string
    serverInfo?: {
      name: string
      version: string
    }
  }
  skillDisconnected: {
    skillName: string
  }
}
export type RuntimeEventType = keyof RuntimeEventPayloads
export type RuntimeEvent = {
  [K in RuntimeEventType]: BaseRuntimeEvent & { type: K } & RuntimeEventPayloads[K]
}[RuntimeEventType]
export type RuntimeEventForType<T extends RuntimeEventType> = Extract<RuntimeEvent, { type: T }>
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
