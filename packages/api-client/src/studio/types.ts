import type { Skill } from "@perstack/core"
import { z } from "zod"

export const applicationSchema = z.object({
  id: z.string(),
  name: z.string(),
})
export type Application = z.infer<typeof applicationSchema>

export const ownerSchema = z.object({
  name: z.string().optional(),
  organizationId: z.string(),
  createdAt: z.string().transform((s) => new Date(s)),
})
export type Owner = z.infer<typeof ownerSchema>

export const studioExpertSchema = z.object({
  type: z.literal("studioExpert"),
  id: z.string(),
  key: z.string(),
  name: z.string(),
  minRuntimeVersion: z.literal("v1.0"),
  description: z.string(),
  owner: ownerSchema,
  createdAt: z.string().transform((s) => new Date(s)),
  updatedAt: z.string().transform((s) => new Date(s)),
  instruction: z.string(),
  skills: z.record(z.string(), z.unknown()).transform((s) => s as Record<string, Skill>),
  delegates: z.array(z.string()),
  forkFrom: z.string().optional(),
  application: applicationSchema,
})
export type StudioExpert = z.infer<typeof studioExpertSchema>

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

export const getStudioExpertResponseSchema = z.object({
  data: z.object({
    expert: studioExpertSchema,
  }),
})

export const listStudioExpertsResponseSchema = z.object({
  data: z.object({
    experts: z.array(expertDigestSchema),
  }),
  meta: z.object({
    total: z.number(),
    take: z.number(),
    skip: z.number(),
  }),
})

export const createStudioExpertResponseSchema = z.object({
  data: z.object({
    expert: studioExpertSchema,
  }),
})

export const updateStudioExpertResponseSchema = z.object({
  data: z.object({
    expert: studioExpertSchema,
  }),
})

export const deleteStudioExpertResponseSchema = z.object({})

export interface CreateStudioExpertInput {
  name: string
  minRuntimeVersion: "v1.0"
  description: string
  instruction: string
  skills: Record<string, unknown>
  delegates: string[]
  forkFrom?: string
}

export interface UpdateStudioExpertInput {
  minRuntimeVersion?: "v1.0"
  description?: string
  instruction?: string
  skills?: Record<string, unknown>
  delegates?: string[]
  forkFrom?: string
}

export interface ListStudioExpertsParams {
  applicationId: string
  filter?: string
  sort?: "name" | "version" | "createdAt" | "updatedAt"
  order?: "asc" | "desc"
  take?: number
  skip?: number
}

export const expertJobStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
  "waiting",
])
export type ExpertJobStatus = z.infer<typeof expertJobStatusSchema>

export const expertJobSchema = z.object({
  id: z.string(),
  expertKey: z.string(),
  status: expertJobStatusSchema,
  query: z.string(),
  createdAt: z.string().transform((s) => new Date(s)),
  updatedAt: z.string().transform((s) => new Date(s)),
  startedAt: z
    .string()
    .transform((s) => new Date(s))
    .optional(),
  completedAt: z
    .string()
    .transform((s) => new Date(s))
    .optional(),
})
export type ExpertJob = z.infer<typeof expertJobSchema>

export const getExpertJobResponseSchema = z.object({
  data: z.object({
    expertJob: expertJobSchema,
  }),
})

export const listExpertJobsResponseSchema = z.object({
  data: z.object({
    expertJobs: z.array(expertJobSchema),
  }),
  meta: z.object({
    total: z.number(),
    take: z.number(),
    skip: z.number(),
  }),
})

export const startExpertJobResponseSchema = z.object({
  data: z.object({
    expertJob: expertJobSchema,
  }),
})

export const continueExpertJobResponseSchema = z.object({
  data: z.object({
    expertJob: expertJobSchema,
  }),
})

export const updateExpertJobResponseSchema = z.object({
  data: z.object({
    expertJob: expertJobSchema,
  }),
})

export interface StartExpertJobInput {
  expertKey: string
  query: string
  workspaceInstanceId?: string
}

export interface ContinueExpertJobInput {
  response: string
}

export interface UpdateExpertJobInput {
  status?: ExpertJobStatus
}

export interface ListExpertJobsParams {
  applicationId: string
  filter?: string
  sort?: "createdAt" | "updatedAt" | "status"
  order?: "asc" | "desc"
  take?: number
  skip?: number
}

export const checkpointSchema = z.object({
  id: z.string(),
  expertJobId: z.string(),
  sequence: z.number(),
  createdAt: z.string().transform((s) => new Date(s)),
})
export type Checkpoint = z.infer<typeof checkpointSchema>

export const getCheckpointResponseSchema = z.object({
  data: z.object({
    checkpoint: checkpointSchema,
  }),
})

export const listCheckpointsResponseSchema = z.object({
  data: z.object({
    checkpoints: z.array(checkpointSchema),
  }),
  meta: z.object({
    total: z.number(),
    take: z.number(),
    skip: z.number(),
  }),
})

export const createCheckpointResponseSchema = z.object({
  data: z.object({
    checkpoint: checkpointSchema,
  }),
})

export interface ListCheckpointsParams {
  take?: number
  skip?: number
  sort?: "sequence" | "createdAt"
  order?: "asc" | "desc"
}

export const workspaceInstanceSchema = z.object({
  id: z.string(),
  expertJobId: z.string(),
  createdAt: z.string().transform((s) => new Date(s)),
})
export type WorkspaceInstance = z.infer<typeof workspaceInstanceSchema>

export const getWorkspaceInstanceResponseSchema = z.object({
  data: z.object({
    workspaceInstance: workspaceInstanceSchema,
  }),
})

export const workspaceItemSchema = z.object({
  id: z.string(),
  path: z.string(),
  type: z.enum(["file", "directory"]),
  size: z.number().optional(),
  createdAt: z.string().transform((s) => new Date(s)),
  updatedAt: z.string().transform((s) => new Date(s)),
})
export type WorkspaceItem = z.infer<typeof workspaceItemSchema>

export const getWorkspaceItemResponseSchema = z.object({
  data: z.object({
    item: workspaceItemSchema,
  }),
})

export const listWorkspaceItemsResponseSchema = z.object({
  data: z.object({
    items: z.array(workspaceItemSchema),
  }),
  meta: z.object({
    total: z.number(),
    take: z.number(),
    skip: z.number(),
  }),
})

export const createWorkspaceItemResponseSchema = z.object({
  data: z.object({
    item: workspaceItemSchema,
  }),
})

export const updateWorkspaceItemResponseSchema = z.object({
  data: z.object({
    item: workspaceItemSchema,
  }),
})

export const deleteWorkspaceItemResponseSchema = z.object({})

export const findWorkspaceItemsResponseSchema = z.object({
  data: z.object({
    items: z.array(workspaceItemSchema),
  }),
})

export interface ListWorkspaceItemsParams {
  take?: number
  skip?: number
  path?: string
}

export const workspaceSchema = z.object({
  id: z.string(),
  applicationId: z.string(),
  createdAt: z.string().transform((s) => new Date(s)),
  updatedAt: z.string().transform((s) => new Date(s)),
})
export type Workspace = z.infer<typeof workspaceSchema>

export const getWorkspaceResponseSchema = z.object({
  data: z.object({
    workspace: workspaceSchema,
  }),
})

export const workspaceVariableSchema = z.object({
  name: z.string(),
  value: z.string(),
})
export type WorkspaceVariable = z.infer<typeof workspaceVariableSchema>

export const workspaceSecretSchema = z.object({
  name: z.string(),
})
export type WorkspaceSecret = z.infer<typeof workspaceSecretSchema>

export const createWorkspaceVariableResponseSchema = z.object({
  data: z.object({
    variable: workspaceVariableSchema,
  }),
})

export const updateWorkspaceVariableResponseSchema = z.object({
  data: z.object({
    variable: workspaceVariableSchema,
  }),
})

export const deleteWorkspaceVariableResponseSchema = z.object({})

export const createWorkspaceSecretResponseSchema = z.object({
  data: z.object({
    secret: workspaceSecretSchema,
  }),
})

export const deleteWorkspaceSecretResponseSchema = z.object({})

export interface CreateWorkspaceVariableInput {
  name: string
  value: string
}

export interface UpdateWorkspaceVariableInput {
  value: string
}

export interface CreateWorkspaceSecretInput {
  name: string
  value: string
}
