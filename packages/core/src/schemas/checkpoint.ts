import { z } from "zod"
import type { Message } from "./message.js"
import { messageSchema } from "./message.js"
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

/**
 * A checkpoint represents a point-in-time snapshot of an Expert's execution state.
 * Used for resuming, debugging, and observability.
 */
export interface Checkpoint {
  /** Unique identifier for this checkpoint */
  id: string
  /** Run ID this checkpoint belongs to */
  runId: string
  /** Current execution status */
  status: CheckpointStatus
  /** Current step number */
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
  /** If delegating, information about the target Expert */
  delegateTo?: {
    /** The Expert being delegated to */
    expert: {
      key: string
      name: string
      version: string
    }
    /** Tool call ID that triggered delegation */
    toolCallId: string
    /** Name of the delegation tool */
    toolName: string
    /** Query passed to the delegate */
    query: string
  }
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
}

export const checkpointSchema = z.object({
  id: z.string(),
  runId: z.string(),
  status: checkpointStatusSchema,
  stepNumber: z.number(),
  messages: z.array(messageSchema),
  expert: z.object({
    key: z.string(),
    name: z.string(),
    version: z.string(),
  }),
  delegateTo: z
    .object({
      expert: z.object({
        key: z.string(),
        name: z.string(),
        version: z.string(),
      }),
      toolCallId: z.string(),
      toolName: z.string(),
      query: z.string(),
    })
    .optional(),
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
})
checkpointSchema satisfies z.ZodType<Checkpoint>
