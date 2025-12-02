import { z } from "zod"
import type { ApiV1Client } from "../client.js"
import {
  type ApiExpertDigest,
  type ApiRegistryExpert,
  apiExpertDigestSchema,
  apiRegistryExpertSchema,
} from "../schemas/expert.js"

/**
 * Create a registry expert
 */
const createRegistryExpertInput = z.object({
  name: apiRegistryExpertSchema.shape.name,
  version: apiRegistryExpertSchema.shape.version,
  minRuntimeVersion: apiRegistryExpertSchema.shape.minRuntimeVersion,
  description: apiRegistryExpertSchema.shape.description,
  instruction: apiRegistryExpertSchema.shape.instruction,
  skills: apiRegistryExpertSchema.shape.skills,
  delegates: apiRegistryExpertSchema.shape.delegates,
  tags: apiRegistryExpertSchema.shape.tags,
})
const createRegistryExpertResponseSchema = z.object({
  data: z.object({
    expert: apiRegistryExpertSchema,
  }),
})

export type CreateRegistryExpertInput = z.input<typeof createRegistryExpertInput>
export async function createRegistryExpert(
  input: CreateRegistryExpertInput,
  client: ApiV1Client,
): Promise<{
  expert: ApiRegistryExpert
}> {
  const { name, version, minRuntimeVersion, description, instruction, skills, delegates, tags } =
    createRegistryExpertInput.parse(input)
  const endpoint = "/api/registry/v1/experts"
  const json = await client.requestAuthenticated(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      version,
      minRuntimeVersion,
      description,
      instruction,
      skills,
      delegates,
      tags,
    }),
  })
  const { data } = createRegistryExpertResponseSchema.parse(json)
  return {
    expert: data.expert,
  }
}

/**
 * Retrieve a registry expert
 */
const getRegistryExpertInput = z.object({
  expertKey: apiRegistryExpertSchema.shape.key,
})
const getRegistryExpertResponseSchema = z.object({
  data: z.object({
    expert: apiRegistryExpertSchema,
  }),
})

export type GetRegistryExpertInput = z.input<typeof getRegistryExpertInput>
export async function getRegistryExpert(
  input: GetRegistryExpertInput,
  client: ApiV1Client,
): Promise<{
  expert: ApiRegistryExpert
}> {
  const { expertKey } = getRegistryExpertInput.parse(input)
  const endpoint = `/api/registry/v1/experts/${encodeURIComponent(expertKey)}`
  const json = await client.request(endpoint, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
  const { data } = getRegistryExpertResponseSchema.parse(json)
  return {
    expert: data.expert,
  }
}

/**
 * Retrieve multiple registry experts
 */
const getRegistryExpertsInput = z.object({
  take: z
    .union([z.number(), z.string().transform((value) => Number.parseInt(value, 10))])
    .optional(),
  skip: z
    .union([z.number(), z.string().transform((value) => Number.parseInt(value, 10))])
    .optional(),
  sort: z.string().optional(),
  order: z.string().optional(),
  filter: z.string().optional(),
  organizationId: z.string().optional(),
})
const getRegistryExpertsResponseSchema = z.object({
  data: z.object({
    experts: z.array(apiRegistryExpertSchema),
  }),
  meta: z.object({
    total: z.number(),
    take: z.number(),
    skip: z.number(),
  }),
})

export type GetRegistryExpertsInput = z.input<typeof getRegistryExpertsInput>
export async function getRegistryExperts(
  input: GetRegistryExpertsInput,
  client: ApiV1Client,
): Promise<{
  experts: ApiRegistryExpert[]
  total: number
  take: number
  skip: number
}> {
  const {
    sort,
    order,
    take: takeParam,
    skip: skipParam,
    filter,
    organizationId,
  } = getRegistryExpertsInput.parse(input)
  const url = new URL("/api/registry/v1/experts", client.baseUrl)
  if (takeParam) url.searchParams.set("take", takeParam.toString())
  if (skipParam) url.searchParams.set("skip", skipParam.toString())
  if (sort) url.searchParams.set("sort", sort)
  if (order) url.searchParams.set("order", order)
  if (filter) url.searchParams.set("filter", filter)
  if (organizationId) url.searchParams.set("organizationId", organizationId)
  const endpoint = url.toString()
  const json = await client.request(endpoint, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
  const { data, meta } = getRegistryExpertsResponseSchema.parse(json)
  return {
    experts: data.experts,
    total: meta.total,
    take: meta.take,
    skip: meta.skip,
  }
}

/**
 * Retrieve multiple registry expert versions
 */
const getRegistryExpertVersionsInput = z.object({
  expertKey: apiRegistryExpertSchema.shape.key,
})
const getRegistryExpertVersionsResponseSchema = z.object({
  data: z.object({
    versions: z.array(apiExpertDigestSchema),
    latest: z.string(),
  }),
  meta: z.object({
    total: z.number(),
  }),
})

export type GetRegistryExpertVersionsInput = z.input<typeof getRegistryExpertVersionsInput>
export async function getRegistryExpertVersions(
  input: GetRegistryExpertVersionsInput,
  client: ApiV1Client,
): Promise<{
  versions: ApiExpertDigest[]
  latest: string
  total: number
}> {
  const { expertKey } = getRegistryExpertVersionsInput.parse(input)
  const endpoint = `/api/registry/v1/experts/${encodeURIComponent(expertKey)}/versions`
  const json = await client.request(endpoint, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
  const { data, meta } = getRegistryExpertVersionsResponseSchema.parse(json)
  return {
    versions: data.versions,
    latest: data.latest,
    total: meta.total,
  }
}

/**
 * Update a registry expert
 */
const updateRegistryExpertInput = z.object({
  expertKey: apiRegistryExpertSchema.shape.key,
  status: apiRegistryExpertSchema.shape.status.optional(),
  tags: apiRegistryExpertSchema.shape.tags.optional(),
})
const updateRegistryExpertResponseSchema = z.object({
  data: z.object({
    expert: apiRegistryExpertSchema,
  }),
})

export type UpdateRegistryExpertInput = z.input<typeof updateRegistryExpertInput>
export async function updateRegistryExpert(
  input: UpdateRegistryExpertInput,
  client: ApiV1Client,
): Promise<{
  expert: ApiRegistryExpert
}> {
  const { expertKey, status, tags } = updateRegistryExpertInput.parse(input)
  const endpoint = `/api/registry/v1/experts/${encodeURIComponent(expertKey)}`
  const json = await client.requestAuthenticated(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      status,
      tags,
    }),
  })
  const { data } = updateRegistryExpertResponseSchema.parse(json)
  return {
    expert: data.expert,
  }
}

/**
 * Delete a registry expert
 */
const deleteRegistryExpertInput = z.object({
  expertKey: apiRegistryExpertSchema.shape.key,
})

export type DeleteRegistryExpertInput = z.input<typeof deleteRegistryExpertInput>
export async function deleteRegistryExpert(
  input: DeleteRegistryExpertInput,
  client: ApiV1Client,
): Promise<void> {
  const { expertKey } = deleteRegistryExpertInput.parse(input)
  const endpoint = `/api/registry/v1/experts/${encodeURIComponent(expertKey)}`
  await client.requestAuthenticated(endpoint, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  })
}
