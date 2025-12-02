import { usageSchema } from "@perstack/core"
import { z } from "zod"
import { apiRuntimeVersionSchema } from "./common.js"
import { apiBaseExpertSchema, apiExpertSchema } from "./expert.js"

export const apiExpertJobStatusSchema = z.union([
  z.literal("queued"),
  z.literal("processing"),
  z.literal("completed"),
  z.literal("requestInteractiveToolResult"),
  z.literal("requestDelegateResult"),
  z.literal("exceededMaxSteps"),
  z.literal("failed"),
  z.literal("canceling"),
  z.literal("canceled"),
  z.literal("expired"),
])
export type ApiExpertJobStatus = z.infer<typeof apiExpertJobStatusSchema>

export const apiExpertJobSchema = z.object({
  type: z.literal("expertJob"),
  id: z.cuid2(),
  status: apiExpertJobStatusSchema,
  runtimeVersion: apiRuntimeVersionSchema,
  expertKey: apiBaseExpertSchema.shape.key,
  query: z
    .string()
    .min(1)
    .max(1024 * 20)
    .optional(),
  files: z
    .array(
      z
        .string()
        .min(1)
        .max(1024 * 20),
    )
    .optional(),
  interactiveToolCallResult: z.boolean().optional(),
  expert: apiExpertSchema,
  model: z.string().min(1).max(256),
  temperature: z.number().min(0).max(1).optional(),
  maxSteps: z.number().min(1).optional(),
  maxRetries: z.number().min(0).optional(),
  currentStep: z.number().min(0).optional(),
  totalSteps: z.number().min(0).optional(),
  totalDuration: z.number().min(0).optional(),
  usage: usageSchema,
  createdAt: z.iso.datetime().transform((date) => new Date(date)),
  updatedAt: z.iso.datetime().transform((date) => new Date(date)),
  applicationId: z.cuid2(),
})
export type ApiExpertJob = z.infer<typeof apiExpertJobSchema>
