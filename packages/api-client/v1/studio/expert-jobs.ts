import { checkpointSchema, stepSchema } from "@perstack/core"
import { z } from "zod"
import type { ApiV1Client } from "../client.js"
import { type ApiCheckpoint, apiCheckpointSchema } from "../schemas/checkpoint.js"
import { apiBaseExpertSchema } from "../schemas/expert.js"
import { type ApiExpertJob, apiExpertJobSchema } from "../schemas/expert-job.js"

/**
 * Start an expert job
 */
const startExpertJobInput = z.object({
  expertKey: apiBaseExpertSchema.shape.key,
  query: apiExpertJobSchema.shape.query,
  files: apiExpertJobSchema.shape.files,
  model: apiExpertJobSchema.shape.model,
  temperature: apiExpertJobSchema.shape.temperature,
  maxSteps: apiExpertJobSchema.shape.maxSteps,
  maxRetries: apiExpertJobSchema.shape.maxRetries,
})
const startExpertJobResponseSchema = z.object({
  data: z.object({
    expertJob: apiExpertJobSchema,
  }),
})

export type StartExpertJobInput = z.input<typeof startExpertJobInput>
export async function startExpertJob(
  input: StartExpertJobInput,
  client: ApiV1Client,
): Promise<{
  expertJob: ApiExpertJob
}> {
  const { expertKey, query, files, model, temperature, maxSteps, maxRetries } =
    startExpertJobInput.parse(input)
  if ((!query || query === "") && (!files || files.length === 0)) {
    throw new Error("Either query or files must be provided")
  }
  const endpoint = "/api/studio/v1/expert_jobs"
  const formData = new FormData()
  formData.append("expertKey", expertKey)
  if (query) formData.append("query", query)
  if (temperature) formData.append("temperature", temperature.toString())
  if (maxSteps) formData.append("maxSteps", maxSteps.toString())
  if (maxRetries) formData.append("maxRetries", maxRetries.toString())
  if (model) formData.append("model", model)
  if (files && files.length > 0) {
    for (const file of files) {
      formData.append("files", file)
    }
  }
  const json = await client.requestAuthenticated(endpoint, {
    method: "POST",
    body: formData,
  })
  const { data } = startExpertJobResponseSchema.parse(json)
  return {
    expertJob: data.expertJob,
  }
}

/**
 * Continue an expert job
 */
const continueExpertJobInput = z.object({
  expertJobId: apiExpertJobSchema.shape.id,
  query: apiExpertJobSchema.shape.query,
  files: apiExpertJobSchema.shape.files,
  interactiveToolCallResult: apiExpertJobSchema.shape.interactiveToolCallResult,
  model: apiExpertJobSchema.shape.model,
  temperature: apiExpertJobSchema.shape.temperature,
  maxSteps: apiExpertJobSchema.shape.maxSteps,
  maxRetries: apiExpertJobSchema.shape.maxRetries,
})
const continueExpertJobResponseSchema = z.object({
  data: z.object({
    expertJob: apiExpertJobSchema,
  }),
})

export type ContinueExpertJobInput = z.input<typeof continueExpertJobInput>
export async function continueExpertJob(
  input: ContinueExpertJobInput,
  client: ApiV1Client,
): Promise<{
  expertJob: ApiExpertJob
}> {
  const {
    expertJobId,
    query,
    files,
    interactiveToolCallResult,
    model,
    temperature,
    maxSteps,
    maxRetries,
  } = continueExpertJobInput.parse(input)
  if ((!query || query === "") && (!files || files.length === 0)) {
    throw new Error("Either query or files must be provided")
  }
  const endpoint = `/api/studio/v1/expert_jobs/${expertJobId}/continue`
  const formData = new FormData()
  if (query) formData.append("query", query)
  if (model) formData.append("model", model)
  if (temperature) formData.append("temperature", temperature.toString())
  if (maxSteps) formData.append("maxSteps", maxSteps.toString())
  if (maxRetries) formData.append("maxRetries", maxRetries.toString())
  if (files) {
    for (const file of files) {
      formData.append("files", file)
    }
  }
  if (interactiveToolCallResult)
    formData.append("interactiveToolCallResult", interactiveToolCallResult.toString())
  const json = await client.requestAuthenticated(endpoint, {
    method: "POST",
    body: formData,
  })
  const { data } = continueExpertJobResponseSchema.parse(json)
  return {
    expertJob: data.expertJob,
  }
}

/**
 * Resume an expert job from a checkpoint
 */
const resumeExpertJobFromCheckpointInput = z.object({
  expertJobId: apiExpertJobSchema.shape.id,
  checkpointId: apiCheckpointSchema.shape.id,
  query: apiExpertJobSchema.shape.query,
  files: apiExpertJobSchema.shape.files,
  interactiveToolCallResult: apiExpertJobSchema.shape.interactiveToolCallResult,
  model: apiExpertJobSchema.shape.model,
  temperature: apiExpertJobSchema.shape.temperature,
  maxSteps: apiExpertJobSchema.shape.maxSteps,
  maxRetries: apiExpertJobSchema.shape.maxRetries,
})
const resumeExpertJobFromCheckpointResponseSchema = z.object({
  data: z.object({
    expertJob: apiExpertJobSchema,
  }),
})

export type ResumeExpertJobFromCheckpointInput = z.input<typeof resumeExpertJobFromCheckpointInput>
export async function resumeExpertJobFromCheckpoint(
  input: ResumeExpertJobFromCheckpointInput,
  client: ApiV1Client,
): Promise<{
  expertJob: ApiExpertJob
}> {
  const {
    expertJobId,
    checkpointId,
    query,
    files,
    interactiveToolCallResult,
    model,
    temperature,
    maxSteps,
    maxRetries,
  } = resumeExpertJobFromCheckpointInput.parse(input)
  if ((!query || query === "") && (!files || files.length === 0)) {
    throw new Error("Either query or files must be provided")
  }
  const endpoint = `/api/studio/v1/expert_jobs/${expertJobId}/resume_from`
  const formData = new FormData()
  formData.append("checkpointId", checkpointId)
  if (query) formData.append("query", query)
  if (model) formData.append("model", model)
  if (temperature) formData.append("temperature", temperature.toString())
  if (maxSteps) formData.append("maxSteps", maxSteps.toString())
  if (maxRetries) formData.append("maxRetries", maxRetries.toString())
  if (files) {
    for (const file of files) {
      formData.append("files", file)
    }
  }
  if (interactiveToolCallResult)
    formData.append("interactiveToolCallResult", interactiveToolCallResult.toString())
  const json = await client.requestAuthenticated(endpoint, {
    method: "POST",
    body: formData,
  })
  const { data } = resumeExpertJobFromCheckpointResponseSchema.parse(json)
  return {
    expertJob: data.expertJob,
  }
}

/**
 * Retrieve an expert job
 */
const getExpertJobInput = z.object({
  expertJobId: apiExpertJobSchema.shape.id,
})
const getExpertJobResponseSchema = z.object({
  data: z.object({
    expertJob: apiExpertJobSchema,
  }),
})

export type GetExpertJobInput = z.input<typeof getExpertJobInput>
export async function getExpertJob(
  input: GetExpertJobInput,
  client: ApiV1Client,
): Promise<{
  expertJob: ApiExpertJob
}> {
  const { expertJobId } = getExpertJobInput.parse(input)
  const endpoint = `/api/studio/v1/expert_jobs/${expertJobId}`
  const json = await client.requestAuthenticated(endpoint, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
  const { data } = getExpertJobResponseSchema.parse(json)
  return {
    expertJob: data.expertJob,
  }
}

/**
 * Retrieve multiple expert jobs
 */
const getExpertJobsInput = z.object({
  take: z
    .union([z.number(), z.string().transform((value) => Number.parseInt(value, 10))])
    .optional(),
  skip: z
    .union([z.number(), z.string().transform((value) => Number.parseInt(value, 10))])
    .optional(),
  sort: z.string().optional(),
  order: z.string().optional(),
  filter: z.string().optional(),
})
const getExpertJobsResponseSchema = z.object({
  data: z.object({
    expertJobs: apiExpertJobSchema.array(),
  }),
  meta: z.object({
    total: z.number(),
    take: z.number(),
    skip: z.number(),
  }),
})

export type GetExpertJobsInput = z.input<typeof getExpertJobsInput>
export async function getExpertJobs(
  input: GetExpertJobsInput,
  client: ApiV1Client,
): Promise<{
  expertJobs: ApiExpertJob[]
  total: number
  take: number
  skip: number
}> {
  const { sort, order, take, skip, filter } = getExpertJobsInput.parse(input)
  const url = new URL("/api/studio/v1/expert_jobs", client.baseUrl)
  const searchParams = url.searchParams
  if (sort) searchParams.set("sort", sort)
  if (order) searchParams.set("order", order)
  if (take) searchParams.set("take", take.toString())
  if (skip) searchParams.set("skip", skip.toString())
  if (filter) searchParams.set("filter", filter)
  const endpoint = url.toString()
  const json = await client.requestAuthenticated(endpoint, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
  const { data, meta } = getExpertJobsResponseSchema.parse(json)
  return {
    expertJobs: data.expertJobs,
    total: meta.total,
    take: meta.take,
    skip: meta.skip,
  }
}

/**
 * Update an expert job
 */
const updateExpertJobInput = z.object({
  expertJobId: apiExpertJobSchema.shape.id,
  status: apiExpertJobSchema.shape.status,
})
const updateExpertJobResponseSchema = z.object({
  data: z.object({
    expertJob: apiExpertJobSchema,
  }),
})

export type UpdateExpertJobInput = z.input<typeof updateExpertJobInput>
export async function updateExpertJob(
  input: UpdateExpertJobInput,
  client: ApiV1Client,
): Promise<{
  expertJob: ApiExpertJob
}> {
  const { expertJobId, status } = updateExpertJobInput.parse(input)
  const endpoint = `/api/studio/v1/expert_jobs/${expertJobId}`
  const json = await client.requestAuthenticated(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      status,
    }),
  })
  const { data } = updateExpertJobResponseSchema.parse(json)
  return {
    expertJob: data.expertJob,
  }
}

/**
 * Create a checkpoint
 */
const createCheckpointInput = z.object({
  expertJobId: apiExpertJobSchema.shape.id,
  checkpoint: checkpointSchema,
  step: stepSchema,
})
const createCheckpointResponseSchema = z.object({
  data: z.object({
    checkpoint: apiCheckpointSchema,
  }),
})

export type CreateCheckpointInput = z.input<typeof createCheckpointInput>
export async function createCheckpoint(
  input: CreateCheckpointInput,
  client: ApiV1Client,
): Promise<{
  checkpoint: ApiCheckpoint
}> {
  const { expertJobId, checkpoint, step } = createCheckpointInput.parse(input)
  const endpoint = `/api/studio/v1/expert_jobs/${expertJobId}/checkpoints`
  const json = await client.requestAuthenticated(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      checkpoint,
      step,
    }),
  })
  const { data } = createCheckpointResponseSchema.parse(json)
  return {
    checkpoint: data.checkpoint,
  }
}

/**
 * Retrieve a checkpoint
 */
const getCheckpointInput = z.object({
  expertJobId: apiExpertJobSchema.shape.id,
  checkpointId: apiCheckpointSchema.shape.id,
})
const getCheckpointResponseSchema = z.object({
  data: z.object({
    checkpoint: apiCheckpointSchema,
  }),
})

export type GetCheckpointInput = z.input<typeof getCheckpointInput>
export async function getCheckpoint(
  input: GetCheckpointInput,
  client: ApiV1Client,
): Promise<{
  checkpoint: ApiCheckpoint
}> {
  const { expertJobId, checkpointId } = getCheckpointInput.parse(input)
  const endpoint = `/api/studio/v1/expert_jobs/${expertJobId}/checkpoints/${checkpointId}`
  const json = await client.requestAuthenticated(endpoint, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
  const { data } = getCheckpointResponseSchema.parse(json)
  return {
    checkpoint: data.checkpoint,
  }
}

/**
 * Retrieve multiple checkpoints
 */
const getCheckpointsInput = z.object({
  expertJobId: apiExpertJobSchema.shape.id,
  take: z
    .union([z.number(), z.string().transform((value) => Number.parseInt(value, 10))])
    .optional(),
  skip: z
    .union([z.number(), z.string().transform((value) => Number.parseInt(value, 10))])
    .optional(),
  sort: z.string().optional(),
  order: z.string().optional(),
  filter: z.string().optional(),
})
const getCheckpointsResponseSchema = z.object({
  data: z.object({
    checkpoints: apiCheckpointSchema.array(),
  }),
  meta: z.object({
    total: z.number(),
    take: z.number(),
    skip: z.number(),
  }),
})

export type GetCheckpointsInput = z.input<typeof getCheckpointsInput>
export async function getCheckpoints(
  input: GetCheckpointsInput,
  client: ApiV1Client,
): Promise<{
  checkpoints: ApiCheckpoint[]
  total: number
  take: number
  skip: number
}> {
  const { expertJobId, sort, order, take, skip, filter } = getCheckpointsInput.parse(input)
  const url = new URL(`/api/studio/v1/expert_jobs/${expertJobId}/checkpoints`)
  const searchParams = url.searchParams
  if (sort) searchParams.set("sort", sort)
  if (order) searchParams.set("order", order)
  if (take) searchParams.set("take", take.toString())
  if (skip) searchParams.set("skip", skip.toString())
  if (filter) searchParams.set("filter", filter)
  const endpoint = url.toString()
  const json = await client.requestAuthenticated(endpoint, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
  const { data, meta } = getCheckpointsResponseSchema.parse(json)
  return {
    checkpoints: data.checkpoints,
    total: meta.total,
    take: meta.take,
    skip: meta.skip,
  }
}
