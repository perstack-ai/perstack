import type { Skill } from "@perstack/core"
import { z } from "zod"

export const registryExpertStatusSchema = z.enum(["available", "deprecated", "disabled"])
export type RegistryExpertStatus = z.infer<typeof registryExpertStatusSchema>

export const ownerSchema = z.object({
  name: z.string().optional(),
  organizationId: z.string(),
  createdAt: z.string().transform((s) => new Date(s)),
})
export type Owner = z.infer<typeof ownerSchema>

export const registryExpertSchema = z.object({
  type: z.literal("registryExpert"),
  id: z.string(),
  key: z.string(),
  name: z.string(),
  minRuntimeVersion: z.literal("v1.0"),
  description: z.string(),
  owner: ownerSchema,
  createdAt: z.string().transform((s) => new Date(s)),
  updatedAt: z.string().transform((s) => new Date(s)),
  version: z.string(),
  status: registryExpertStatusSchema,
  instruction: z.string(),
  skills: z.record(z.string(), z.unknown()).transform((s) => s as Record<string, Skill>),
  delegates: z.array(z.string()),
  tags: z.array(z.string()),
})
export type RegistryExpert = z.infer<typeof registryExpertSchema>

export const expertDigestSchema = z.object({
  type: z.literal("expertDigest"),
  id: z.string(),
  key: z.string(),
  name: z.string(),
  minRuntimeVersion: z.literal("v1.0"),
  description: z.string(),
  owner: ownerSchema,
  createdAt: z.string().transform((s) => new Date(s)),
  updatedAt: z.string().transform((s) => new Date(s)),
  version: z.string().optional(),
  tags: z.array(z.string()),
})
export type ExpertDigest = z.infer<typeof expertDigestSchema>

export const getExpertResponseSchema = z.object({
  data: z.object({
    expert: registryExpertSchema,
  }),
})

export const listExpertsResponseSchema = z.object({
  data: z.object({
    experts: z.array(registryExpertSchema),
  }),
  meta: z.object({
    total: z.number(),
    take: z.number(),
    skip: z.number(),
  }),
})

export const createExpertResponseSchema = z.object({
  data: z.object({
    expert: registryExpertSchema,
  }),
})

export const updateExpertResponseSchema = z.object({
  data: z.object({
    expert: registryExpertSchema,
  }),
})

export const deleteExpertResponseSchema = z.object({})

export const getExpertVersionsResponseSchema = z.object({
  data: z.object({
    versions: z.array(expertDigestSchema),
    latest: z.string(),
  }),
  meta: z.object({
    total: z.number(),
  }),
})

export interface CreateExpertInput {
  name: string
  version: string
  minRuntimeVersion: "v1.0"
  description: string
  instruction: string
  skills: Record<string, unknown>
  delegates?: string[]
  tags?: string[]
}

export interface UpdateExpertInput {
  status?: RegistryExpertStatus
  tags?: string[]
}

export interface ListExpertsParams {
  organizationId?: string
  filter?: string
  sort?: "name" | "version" | "createdAt" | "updatedAt"
  order?: "asc" | "desc"
  take?: number
  skip?: number
}
