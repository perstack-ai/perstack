import { z } from "zod"
import {
  instructionMessageSchema,
  messageSchema,
  toolMessageSchema,
  userMessageSchema,
} from "./message.js"
import { toolCallSchema } from "./tool-call.js"
import { toolResultSchema } from "./tool-result.js"
import { usageSchema } from "./usage.js"

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
export type Step = z.infer<typeof stepSchema>
