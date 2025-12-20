import { z } from "zod"
import type { Message } from "./message.js"
import { messageSchema } from "./message.js"
import type { RuntimeName } from "./runtime-name.js"
import { runtimeNameSchema } from "./runtime-name.js"
import type { ToolCall } from "./tool-call.js"
import { toolCallSchema } from "./tool-call.js"
import type { ToolResult } from "./tool-result.js"
import { toolResultSchema } from "./tool-result.js"
import type { Usage } from "./usage.js"
import { usageSchema } from "./usage.js"

/** Status of a checkpoint in the execution lifecycle */
export type CheckpointStatus =
  | "init"
  | "proceeding"
  | "completed"
  | "stoppedByInteractiveTool"
  | "stoppedByDelegate"
  | "stoppedByExceededMaxSteps"
  | "stoppedByError"

export const checkpointStatusSchema = z.enum([
  "init",
  "proceeding",
  "completed",
  "stoppedByInteractiveTool",
  "stoppedByDelegate",
  "stoppedByExceededMaxSteps",
  "stoppedByError",
])

/** Information about a delegation target */
export interface DelegationTarget {
  expert: {
    key: string
    name: string
    version: string
  }
  toolCallId: string
  toolName: string
  query: string
}

/**
 * A checkpoint represents a point-in-time snapshot of an Expert's execution state.
 * Used for resuming, debugging, and observability.
 */
export interface Checkpoint {
  /** Unique identifier for this checkpoint */
  id: string
  /** Job ID this checkpoint belongs to */
  jobId: string
  /** Run ID this checkpoint belongs to */
  runId: string
  /** Current execution status */
  status: CheckpointStatus
  /** Current step number within this Run */
  stepNumber: number
  /** All messages in the conversation so far */
  messages: Message[]
  /** Expert executing this checkpoint */
  expert: {
    /** Expert key (e.g., "my-expert@1.0.0") */
    key: string
    /** Expert name */
    name: string
    /** Expert version */
    version: string
  }
  /** If delegating, information about the target Expert(s) - supports parallel delegation */
  delegateTo?: DelegationTarget[]
  /** If delegated, information about the parent Expert */
  delegatedBy?: {
    /** The parent Expert that delegated */
    expert: {
      key: string
      name: string
      version: string
    }
    /** Tool call ID from the parent */
    toolCallId: string
    /** Name of the delegation tool */
    toolName: string
    /** Checkpoint ID of the parent */
    checkpointId: string
  }
  /** Accumulated token usage */
  usage: Usage
  /** Model's context window size in tokens */
  contextWindow?: number
  /** Context window usage ratio (0-1) */
  contextWindowUsage?: number
  /** Tool calls waiting to be processed (for resume after delegate/interactive) */
  pendingToolCalls?: ToolCall[]
  /** Partial tool results collected before stopping (for resume) */
  partialToolResults?: ToolResult[]
  /** Optional metadata for runtime-specific information */
  metadata?: {
    /** Runtime that executed this checkpoint */
    runtime?: RuntimeName
    /** Additional runtime-specific data */
    [key: string]: unknown
  }
  /** Error information when status is stoppedByError */
  error?: {
    name: string
    message: string
    statusCode?: number
    isRetryable: boolean
  }
}

export const delegationTargetSchema = z.object({
  expert: z.object({
    key: z.string(),
    name: z.string(),
    version: z.string(),
  }),
  toolCallId: z.string(),
  toolName: z.string(),
  query: z.string(),
})
delegationTargetSchema satisfies z.ZodType<DelegationTarget>

export const checkpointSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  runId: z.string(),
  status: checkpointStatusSchema,
  stepNumber: z.number(),
  messages: z.array(messageSchema),
  expert: z.object({
    key: z.string(),
    name: z.string(),
    version: z.string(),
  }),
  delegateTo: z.array(delegationTargetSchema).optional(),
  delegatedBy: z
    .object({
      expert: z.object({
        key: z.string(),
        name: z.string(),
        version: z.string(),
      }),
      toolCallId: z.string(),
      toolName: z.string(),
      checkpointId: z.string(),
    })
    .optional(),
  usage: usageSchema,
  contextWindow: z.number().optional(),
  contextWindowUsage: z.number().optional(),
  pendingToolCalls: z.array(toolCallSchema).optional(),
  partialToolResults: z.array(toolResultSchema).optional(),
  metadata: z
    .object({
      runtime: runtimeNameSchema.optional(),
    })
    .passthrough()
    .optional(),
  error: z
    .object({
      name: z.string(),
      message: z.string(),
      statusCode: z.number().optional(),
      isRetryable: z.boolean(),
    })
    .optional(),
})
checkpointSchema satisfies z.ZodType<Checkpoint>
