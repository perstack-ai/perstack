import { z } from "zod"
import { messageSchema } from "./message.js"
import { usageSchema } from "./usage.js"

export const checkpointStatusSchema = z.enum([
  "init",
  "proceeding",
  "completed",
  "stoppedByInteractiveTool",
  "stoppedByDelegate",
  "stoppedByExceededMaxSteps",
  "stoppedByError",
])
export type CheckpointStatus = z.infer<typeof checkpointStatusSchema>

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
export type Checkpoint = z.infer<typeof checkpointSchema>
