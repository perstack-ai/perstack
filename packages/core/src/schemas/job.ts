import { z } from "zod"
import type { Usage } from "./usage.js"
import { usageSchema } from "./usage.js"

export type JobStatus =
  | "running"
  | "completed"
  | "stoppedByMaxSteps"
  | "stoppedByInteractiveTool"
  | "stoppedByError"

export const jobStatusSchema = z.enum([
  "running",
  "completed",
  "stoppedByMaxSteps",
  "stoppedByInteractiveTool",
  "stoppedByError",
])

export interface Job {
  id: string
  status: JobStatus
  coordinatorExpertKey: string
  totalSteps: number
  maxSteps?: number
  usage: Usage
  startedAt: number
  finishedAt?: number
}

export const jobSchema = z.object({
  id: z.string(),
  status: jobStatusSchema,
  coordinatorExpertKey: z.string(),
  totalSteps: z.number(),
  maxSteps: z.number().optional(),
  usage: usageSchema,
  startedAt: z.number(),
  finishedAt: z.number().optional(),
})
jobSchema satisfies z.ZodType<Job>
