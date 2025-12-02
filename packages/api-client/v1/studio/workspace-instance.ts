import { z } from "zod"
import type { ApiV1Client } from "../client.js"
import { apiExpertJobSchema } from "../schemas/expert-job.js"
import {
  type ApiWorkspaceInstance,
  apiWorkspaceInstanceSchema,
} from "../schemas/workspace-instance.js"
import {
  type ApiWorkspaceItem,
  apiBaseWorkspaceItemSchema,
  apiWorkspaceItemLifecycleSchema,
  apiWorkspaceItemPermissionSchema,
  apiWorkspaceItemSchema,
} from "../schemas/workspace-item.js"

/**
 * Retrieve the workspace instance
 */
const getWorkspaceInstanceInput = z.object({
  expertJobId: z.string(),
})
const getWorkspaceInstanceResponseSchema = z.object({
  data: z.object({
    workspaceInstance: apiWorkspaceInstanceSchema,
  }),
})

export type GetWorkspaceInstanceInput = z.input<typeof getWorkspaceInstanceInput>
export async function getWorkspaceInstance(
  input: GetWorkspaceInstanceInput,
  client: ApiV1Client,
): Promise<{
  workspaceInstance: ApiWorkspaceInstance
}> {
  const { expertJobId } = getWorkspaceInstanceInput.parse(input)
  const endpoint = `/api/studio/v1/expert_jobs/${expertJobId}/workspace_instance`
  const json = await client.requestAuthenticated(endpoint, {
    headers: {
      "Content-Type": "application/json",
    },
  })
  const { data } = getWorkspaceInstanceResponseSchema.parse(json)
  return {
    workspaceInstance: data.workspaceInstance,
  }
}

/**
 * Create a workspace instance item
 */
const createWorkspaceInstanceItemInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("workspaceItemDirectory"),
    expertJobId: apiExpertJobSchema.shape.id,
    permission: apiWorkspaceItemPermissionSchema,
    path: apiBaseWorkspaceItemSchema.shape.path,
  }),
  z.object({
    type: z.literal("workspaceItemFile"),
    expertJobId: apiExpertJobSchema.shape.id,
    permission: apiWorkspaceItemPermissionSchema,
    path: apiBaseWorkspaceItemSchema.shape.path,
    file: z.instanceof(File),
  }),
])
const createWorkspaceInstanceItemResponseSchema = z.object({
  data: z.object({
    workspaceItem: apiWorkspaceItemSchema,
  }),
})

export type CreateWorkspaceInstanceItemInput = z.input<typeof createWorkspaceInstanceItemInput>
export async function createWorkspaceInstanceItem(
  input: CreateWorkspaceInstanceItemInput,
  client: ApiV1Client,
): Promise<{
  workspaceItem: ApiWorkspaceItem
}> {
  const validatedInput = createWorkspaceInstanceItemInput.parse(input)
  const endpoint = `/api/studio/v1/expert_jobs/${validatedInput.expertJobId}/workspace_instance/items`
  const formData = new FormData()
  formData.append("type", validatedInput.type)
  formData.append("path", validatedInput.path)
  formData.append("permission", validatedInput.permission)
  if (validatedInput.type === "workspaceItemFile") {
    formData.append("file", validatedInput.file)
  }
  const json = await client.requestAuthenticated(endpoint, {
    method: "POST",
    body: formData,
  })
  const { data } = createWorkspaceInstanceItemResponseSchema.parse(json)
  return {
    workspaceItem: data.workspaceItem,
  }
}

/**
 * Retrieve a workspace instance item
 */
const getWorkspaceInstanceItemInput = z.object({
  expertJobId: z.string(),
  itemId: z.string(),
})
const getWorkspaceInstanceItemResponseSchema = z.object({
  data: z.object({
    workspaceItem: apiWorkspaceItemSchema,
  }),
})

export type GetWorkspaceInstanceItemInput = z.input<typeof getWorkspaceInstanceItemInput>
export async function getWorkspaceInstanceItem(
  input: GetWorkspaceInstanceItemInput,
  client: ApiV1Client,
): Promise<{
  workspaceItem: ApiWorkspaceItem
}> {
  const { expertJobId, itemId } = getWorkspaceInstanceItemInput.parse(input)
  const endpoint = `/api/studio/v1/expert_jobs/${expertJobId}/workspace_instance/items/${itemId}`
  const json = await client.requestAuthenticated(endpoint, {
    headers: {
      "Content-Type": "application/json",
    },
  })
  const { data } = getWorkspaceInstanceItemResponseSchema.parse(json)
  return {
    workspaceItem: data.workspaceItem,
  }
}

/**
 * Retrieve multiple workspace instance items
 */
const getWorkspaceInstanceItemsInput = z.object({
  expertJobId: z.string(),
  take: z
    .union([z.number(), z.string().transform((value) => Number.parseInt(value, 10))])
    .optional(),
  skip: z
    .union([z.number(), z.string().transform((value) => Number.parseInt(value, 10))])
    .optional(),
})
const getWorkspaceInstanceItemsResponseSchema = z.object({
  data: z.object({
    workspaceItems: z.array(apiWorkspaceItemSchema),
  }),
  meta: z.object({
    total: z.number(),
    take: z.number(),
    skip: z.number(),
  }),
})

export type GetWorkspaceInstanceItemsInput = z.input<typeof getWorkspaceInstanceItemsInput>
export async function getWorkspaceInstanceItems(
  input: GetWorkspaceInstanceItemsInput,
  client: ApiV1Client,
): Promise<{
  workspaceItems: ApiWorkspaceItem[]
  total: number
  take: number
  skip: number
}> {
  const { expertJobId, take, skip } = getWorkspaceInstanceItemsInput.parse(input)
  const url = new URL(`/api/studio/v1/expert_jobs/${expertJobId}/workspace_instance/items`)
  if (take) url.searchParams.set("take", take.toString())
  if (skip) url.searchParams.set("skip", skip.toString())
  const endpoint = url.toString()
  const json = await client.requestAuthenticated(endpoint, {
    headers: {
      "Content-Type": "application/json",
    },
  })
  const { data, meta } = getWorkspaceInstanceItemsResponseSchema.parse(json)
  return {
    workspaceItems: data.workspaceItems,
    total: meta.total,
    take: meta.take,
    skip: meta.skip,
  }
}

/**
 * Download a workspace instance item
 */
const downloadWorkspaceInstanceItemInput = z.object({
  expertJobId: z.string(),
  itemId: z.string(),
})
const _downloadWorkspaceInstanceItemResponseSchema = z.object({
  data: z.object({
    workspaceItem: apiWorkspaceItemSchema,
  }),
})

export type DownloadWorkspaceInstanceItemInput = z.input<typeof downloadWorkspaceInstanceItemInput>
export async function downloadWorkspaceInstanceItem(
  input: DownloadWorkspaceInstanceItemInput,
  client: ApiV1Client,
): Promise<Blob> {
  const { expertJobId, itemId } = downloadWorkspaceInstanceItemInput.parse(input)
  const endpoint = `/api/studio/v1/expert_jobs/${expertJobId}/workspace_instance/items/${itemId}/download`
  const blob = await client.requestBlobAuthenticated(endpoint, {
    headers: {
      "Content-Type": "application/json",
    },
  })
  return blob
}

/**
 * Update a workspace instance item
 */
const updateWorkspaceInstanceItemInput = z.object({
  expertJobId: apiExpertJobSchema.shape.id,
  itemId: z.string(),
  permission: apiWorkspaceItemPermissionSchema.optional(),
  path: apiBaseWorkspaceItemSchema.shape.path.optional(),
  lifecycle: apiWorkspaceItemLifecycleSchema.optional(),
})
const updateWorkspaceInstanceItemResponseSchema = z.object({
  data: z.object({
    workspaceItem: apiWorkspaceItemSchema,
  }),
})

export type UpdateWorkspaceInstanceItemInput = z.input<typeof updateWorkspaceInstanceItemInput>
export async function updateWorkspaceInstanceItem(
  input: UpdateWorkspaceInstanceItemInput,
  client: ApiV1Client,
): Promise<{
  workspaceItem: ApiWorkspaceItem
}> {
  const { expertJobId, itemId, permission, path, lifecycle } =
    updateWorkspaceInstanceItemInput.parse(input)
  const endpoint = `/api/studio/v1/expert_jobs/${expertJobId}/workspace_instance/items/${itemId}`
  const json = await client.requestAuthenticated(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ permission, path, lifecycle }),
  })
  const { data } = updateWorkspaceInstanceItemResponseSchema.parse(json)
  return {
    workspaceItem: data.workspaceItem,
  }
}

/**
 * Delete a workspace instance item
 */
const deleteWorkspaceInstanceItemInput = z.object({
  expertJobId: apiExpertJobSchema.shape.id,
  itemId: z.string(),
})
export type DeleteWorkspaceInstanceItemInput = z.input<typeof deleteWorkspaceInstanceItemInput>
export async function deleteWorkspaceInstanceItem(
  input: DeleteWorkspaceInstanceItemInput,
  client: ApiV1Client,
): Promise<void> {
  const { expertJobId, itemId } = deleteWorkspaceInstanceItemInput.parse(input)
  const endpoint = `/api/studio/v1/expert_jobs/${expertJobId}/workspace_instance/items/${itemId}`
  await client.requestAuthenticated(endpoint, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  })
}
/**
 * Find workspace instance items by path
 */
const findWorkspaceInstanceItemsInput = z.object({
  expertJobId: z.string(),
  path: z.string(),
})
const findWorkspaceInstanceItemsResponseSchema = z.object({
  data: z.object({
    workspaceItems: z.array(apiWorkspaceItemSchema),
  }),
})
export type FindWorkspaceInstanceItemsInput = z.input<typeof findWorkspaceInstanceItemsInput>
export async function findWorkspaceInstanceItems(
  input: FindWorkspaceInstanceItemsInput,
  client: ApiV1Client,
): Promise<{ workspaceItems: ApiWorkspaceItem[] }> {
  const { expertJobId, path } = findWorkspaceInstanceItemsInput.parse(input)
  const url = new URL(
    `/api/studio/v1/expert_jobs/${expertJobId}/workspace_instance/items/find`,
    client.baseUrl,
  )
  url.searchParams.set("path", path)
  const endpoint = url.toString()
  const json = await client.requestAuthenticated(endpoint, {
    headers: { "Content-Type": "application/json" },
  })
  const { data } = findWorkspaceInstanceItemsResponseSchema.parse(json)
  return { workspaceItems: data.workspaceItems }
}
