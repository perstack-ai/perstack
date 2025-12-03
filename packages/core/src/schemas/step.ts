import { z } from "zod"
import type { InstructionMessage, Message, ToolMessage, UserMessage } from "./message.js"
import {
  instructionMessageSchema,
  messageSchema,
  toolMessageSchema,
  userMessageSchema,
} from "./message.js"
import type { ToolCall } from "./tool-call.js"
import { toolCallSchema } from "./tool-call.js"
import type { ToolResult } from "./tool-result.js"
import { toolResultSchema } from "./tool-result.js"
import type { Usage } from "./usage.js"
import { usageSchema } from "./usage.js"

/**
 * A single execution step in an Expert run.
 * Each step represents one LLM generation cycle, optionally followed by a tool call.
 */
export interface Step {
  /** Sequential step number (1-indexed) */
  stepNumber: number
  /** Messages sent to the LLM for this step */
  inputMessages?: (InstructionMessage | UserMessage | ToolMessage)[]
  /** Messages generated during this step */
  newMessages: Message[]
  /** Tool call made during this step, if any */
  toolCall?: ToolCall
  /** Result of the tool call, if any */
  toolResult?: ToolResult
  /** Token usage for this step */
  usage: Usage
  /** Unix timestamp (ms) when step started */
  startedAt: number
  /** Unix timestamp (ms) when step finished */
  finishedAt?: number
}

export const stepSchema = z.object({
  stepNumber: z.number(),
  inputMessages: z
    .array(z.union([instructionMessageSchema, userMessageSchema, toolMessageSchema]))
    .optional(),
  newMessages: z.array(messageSchema),
  toolCall: toolCallSchema.optional(),
  toolResult: toolResultSchema.optional(),
  usage: usageSchema,
  startedAt: z.number(),
  finishedAt: z.number().optional(),
})
stepSchema satisfies z.ZodType<Step>
