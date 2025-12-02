import { z } from "zod"
import type { ApiV1Client } from "../client.js"
import {
  type ApiExpertDigest,
  type ApiStudioExpert,
  apiExpertDigestSchema,
  apiStudioExpertSchema,
} from "../schemas/expert.js"

/**
 * Create a studio expert
 */
const createStudioExpertInput = z.object({
  name: apiStudioExpertSchema.shape.name,
  minRuntimeVersion: apiStudioExpertSchema.shape.minRuntimeVersion,
  description: apiStudioExpertSchema.shape.description,
  instruction: apiStudioExpertSchema.shape.instruction,
  delegates: apiStudioExpertSchema.shape.delegates,
  skills: apiStudioExpertSchema.shape.skills,
  forkFrom: apiStudioExpertSchema.shape.forkFrom,
})
const createStudioExpertResponseSchema = z.object({
  data: z.object({
    expert: apiStudioExpertSchema,
  }),
})

export type CreateStudioExpertInput = z.input<typeof createStudioExpertInput>
export async function createStudioExpert(
  input: CreateStudioExpertInput,
  client: ApiV1Client,
): Promise<{
  expert: ApiStudioExpert
}> {
  const { name, minRuntimeVersion, description, instruction, skills, delegates, forkFrom } =
    createStudioExpertInput.parse(input)
  const endpoint = "/api/studio/v1/experts"
  const json = await client.requestAuthenticated(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      minRuntimeVersion,
      description,
      instruction,
      skills,
      delegates,
      forkFrom,
    }),
  })
  const { data } = createStudioExpertResponseSchema.parse(json)
  return {
    expert: data.expert,
  }
}

/**
 * Retrieve a studio expert
 */
const getStudioExpertInput = z.object({
  expertKey: apiStudioExpertSchema.shape.key,
})
const getStudioExpertResponseSchema = z.object({
  data: z.object({
    expert: apiStudioExpertSchema,
  }),
})

export type GetStudioExpertInput = z.input<typeof getStudioExpertInput>
export async function getStudioExpert(
  input: GetStudioExpertInput,
  client: ApiV1Client,
): Promise<{
  expert: ApiStudioExpert
}> {
  const { expertKey } = getStudioExpertInput.parse(input)
  const endpoint = `/api/studio/v1/experts/${encodeURIComponent(expertKey)}`
  const json = await client.requestAuthenticated(endpoint, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
  const { data } = getStudioExpertResponseSchema.parse(json)
  return {
    expert: data.expert,
  }
}

/**
 * Retrieve multiple studio experts
 */
const getStudioExpertsInput = z.object({
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
const getStudioExpertsResponseSchema = z.object({
  data: z.object({
    experts: z.array(apiExpertDigestSchema),
  }),
  meta: z.object({
    total: z.number(),
    take: z.number(),
    skip: z.number(),
  }),
})

export type GetStudioExpertsInput = z.input<typeof getStudioExpertsInput>
export async function getStudioExperts(
  input: GetStudioExpertsInput,
  client: ApiV1Client,
): Promise<{
  experts: ApiExpertDigest[]
  total: number
  take: number
  skip: number
}> {
  const { sort, order, take, skip, filter } = getStudioExpertsInput.parse(input)
  const url = new URL("/api/studio/v1/experts", client.baseUrl)
  if (take) url.searchParams.set("take", take.toString())
  if (skip) url.searchParams.set("skip", skip.toString())
  if (sort) url.searchParams.set("sort", sort)
  if (order) url.searchParams.set("order", order)
  if (filter) url.searchParams.set("filter", filter)
  const endpoint = url.toString()
  const json = await client.requestAuthenticated(endpoint, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
  const { data, meta } = getStudioExpertsResponseSchema.parse(json)
  return {
    experts: data.experts,
    total: meta.total,
    take: meta.take,
    skip: meta.skip,
  }
}

/**
 * Update a studio expert
 */
const updateStudioExpertInput = z.object({
  expertKey: apiStudioExpertSchema.shape.key,
  minRuntimeVersion: apiStudioExpertSchema.shape.minRuntimeVersion,
  description: apiStudioExpertSchema.shape.description,
  instruction: apiStudioExpertSchema.shape.instruction,
  delegates: apiStudioExpertSchema.shape.delegates,
  skills: apiStudioExpertSchema.shape.skills,
  forkFrom: apiStudioExpertSchema.shape.forkFrom,
})
const updateStudioExpertResponseSchema = z.object({
  data: z.object({
    expert: apiStudioExpertSchema,
  }),
})

export type UpdateStudioExpertInput = z.input<typeof updateStudioExpertInput>
export async function updateStudioExpert(
  input: UpdateStudioExpertInput,
  client: ApiV1Client,
): Promise<{
  expert: ApiStudioExpert
}> {
  const { expertKey, minRuntimeVersion, description, instruction, skills, delegates, forkFrom } =
    updateStudioExpertInput.parse(input)
  const endpoint = `/api/studio/v1/experts/${encodeURIComponent(expertKey)}`
  const json = await client.requestAuthenticated(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      minRuntimeVersion,
      description,
      instruction,
      skills,
      delegates,
      forkFrom,
    }),
  })
  const { data } = updateStudioExpertResponseSchema.parse(json)
  return {
    expert: data.expert,
  }
}

/**
 * Delete a studio expert
 */
const deleteStudioExpertInput = z.object({
  expertKey: apiStudioExpertSchema.shape.key,
})

export type DeleteStudioExpertInput = z.input<typeof deleteStudioExpertInput>
export async function deleteStudioExpert(
  input: DeleteStudioExpertInput,
  client: ApiV1Client,
): Promise<void> {
  const { expertKey } = deleteStudioExpertInput.parse(input)
  const endpoint = `/api/studio/v1/experts/${encodeURIComponent(expertKey)}`
  await client.requestAuthenticated(endpoint, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  })
}
