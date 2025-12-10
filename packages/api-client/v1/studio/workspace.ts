import { z } from "zod"
import type { ApiV1Client } from "../client.js"
import { type ApiWorkspace, apiWorkspaceSchema } from "../schemas/workspace.js"
import {
  type ApiWorkspaceItem,
  apiWorkspaceItemLifecycleSchema,
  apiWorkspaceItemPermissionSchema,
  apiWorkspaceItemSchema,
} from "../schemas/workspace-item.js"

/**
 * Retrieve the workspace
 */
const getWorkspaceResponseSchema = z.object({
  data: z.object({
    workspace: apiWorkspaceSchema,
  }),
})
export async function getWorkspace(client: ApiV1Client): Promise<{
  workspace: ApiWorkspace
}> {
  const endpoint = "/api/studio/v1/workspace"
  const json = await client.requestAuthenticated(endpoint, {
    headers: {
      "Content-Type": "application/json",
    },
  })
  const { data } = getWorkspaceResponseSchema.parse(json)
  return {
    workspace: data.workspace,
  }
}

/**
 * Create a workspace item
 */
const createWorkspaceItemInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("workspaceItemDirectory"),
    permission: apiWorkspaceItemPermissionSchema,
    path: z.string(),
  }),
  z.object({
    type: z.literal("workspaceItemFile"),
    permission: apiWorkspaceItemPermissionSchema,
    path: z.string(),
    file: z.instanceof(File),
  }),
])
const createWorkspaceItemResponseSchema = z.object({
  data: z.object({
    workspaceItem: apiWorkspaceItemSchema,
  }),
})

export type CreateWorkspaceItemInput = z.input<typeof createWorkspaceItemInput>
export async function createWorkspaceItem(
  input: CreateWorkspaceItemInput,
  client: ApiV1Client,
): Promise<{
  workspaceItem: ApiWorkspaceItem
}> {
  const validatedInput = createWorkspaceItemInput.parse(input)
  const endpoint = "/api/studio/v1/workspace/items"
  const formData = new FormData()
  formData.append("type", validatedInput.type)
  formData.append("permission", validatedInput.permission)
  formData.append("path", validatedInput.path)
  if (validatedInput.type === "workspaceItemFile") {
    formData.append("file", validatedInput.file)
  }
  const json = await client.requestAuthenticated(endpoint, {
    method: "POST",
    body: formData,
  })
  const { data } = createWorkspaceItemResponseSchema.parse(json)
  return {
    workspaceItem: data.workspaceItem,
  }
}

/**
 * Retrieve a workspace item
 */
const getWorkspaceItemInput = z.object({
  itemId: z.string(),
})
const getWorkspaceItemResponseSchema = z.object({
  data: z.object({
    workspaceItem: apiWorkspaceItemSchema,
  }),
})

export type GetWorkspaceItemInput = z.input<typeof getWorkspaceItemInput>
export async function getWorkspaceItem(
  input: GetWorkspaceItemInput,
  client: ApiV1Client,
): Promise<{
  workspaceItem: ApiWorkspaceItem
}> {
  const { itemId } = getWorkspaceItemInput.parse(input)
  const endpoint = `/api/studio/v1/workspace/items/${itemId}`
  const json = await client.requestAuthenticated(endpoint, {
    headers: {
      "Content-Type": "application/json",
    },
  })
  const { data } = getWorkspaceItemResponseSchema.parse(json)
  return {
    workspaceItem: data.workspaceItem,
  }
}

/**
 * Retrieve multiple workspace items
 */
const getWorkspaceItemsInput = z.object({
  take: z
    .union([z.number(), z.string().transform((value) => Number.parseInt(value, 10))])
    .optional(),
  skip: z
    .union([z.number(), z.string().transform((value) => Number.parseInt(value, 10))])
    .optional(),
})
const getWorkspaceItemsResponseSchema = z.object({
  data: z.object({
    workspaceItems: z.array(apiWorkspaceItemSchema),
  }),
  meta: z.object({
    total: z.number(),
    take: z.number(),
    skip: z.number(),
  }),
})

export type GetWorkspaceItemsInput = z.input<typeof getWorkspaceItemsInput>
export async function getWorkspaceItems(
  input: GetWorkspaceItemsInput,
  client: ApiV1Client,
): Promise<{
  workspaceItems: ApiWorkspaceItem[]
  total: number
  take: number
  skip: number
}> {
  const { take, skip } = getWorkspaceItemsInput.parse(input)
  const url = new URL("/api/studio/v1/workspace/items", client.baseUrl)
  if (take) url.searchParams.set("take", take.toString())
  if (skip) url.searchParams.set("skip", skip.toString())
  const endpoint = url.toString()
  const json = await client.requestAuthenticated(endpoint, {
    headers: {
      "Content-Type": "application/json",
    },
  })
  const { data, meta } = getWorkspaceItemsResponseSchema.parse(json)
  return {
    workspaceItems: data.workspaceItems,
    total: meta.total,
    take: meta.take,
    skip: meta.skip,
  }
}

/**
 * Download a workspace file item
 */
const downloadWorkspaceItemInput = z.object({
  itemId: z.string(),
})

export type DownloadWorkspaceItemInput = z.input<typeof downloadWorkspaceItemInput>
export async function downloadWorkspaceItem(
  input: DownloadWorkspaceItemInput,
  client: ApiV1Client,
): Promise<Blob> {
  const { itemId } = downloadWorkspaceItemInput.parse(input)
  const endpoint = `/api/studio/v1/workspace/items/${itemId}/download`
  const blob = await client.requestBlobAuthenticated(endpoint, {
    headers: {
      "Content-Type": "application/json",
    },
  })
  return blob
}

/**
 * Update a workspace item
 */
const updateWorkspaceItemInput = z.object({
  itemId: z.string(),
  permission: apiWorkspaceItemPermissionSchema.optional(),
  path: z.string().min(1).max(1024).optional(),
  lifecycle: apiWorkspaceItemLifecycleSchema.optional(),
})
const updateWorkspaceItemResponseSchema = z.object({
  data: z.object({
    workspaceItem: apiWorkspaceItemSchema,
  }),
})

export type UpdateWorkspaceItemInput = z.input<typeof updateWorkspaceItemInput>
export async function updateWorkspaceItem(
  input: UpdateWorkspaceItemInput,
  client: ApiV1Client,
): Promise<{
  workspaceItem: ApiWorkspaceItem
}> {
  const { itemId, permission, path, lifecycle } = updateWorkspaceItemInput.parse(input)
  const endpoint = `/api/studio/v1/workspace/items/${itemId}`
  const json = await client.requestAuthenticated(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ permission, path, lifecycle }),
  })
  const { data } = updateWorkspaceItemResponseSchema.parse(json)
  return {
    workspaceItem: data.workspaceItem,
  }
}

/**
 * Delete a workspace item
 */
const deleteWorkspaceItemInput = z.object({
  itemId: z.string(),
})

export type DeleteWorkspaceItemInput = z.input<typeof deleteWorkspaceItemInput>
export async function deleteWorkspaceItem(
  input: DeleteWorkspaceItemInput,
  client: ApiV1Client,
): Promise<void> {
  const { itemId } = deleteWorkspaceItemInput.parse(input)
  const endpoint = `/api/studio/v1/workspace/items/${itemId}`
  await client.requestAuthenticated(endpoint, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  })
}

/**
 * Create a workspace variable
 */
const createWorkspaceVariableInput = z.object({
  name: z.string(),
  value: z.string(),
})
const createWorkspaceVariableResponseSchema = z.object({
  data: z.object({
    workspace: apiWorkspaceSchema,
  }),
})

export type CreateWorkspaceVariableInput = z.input<typeof createWorkspaceVariableInput>
export async function createWorkspaceVariable(
  input: CreateWorkspaceVariableInput,
  client: ApiV1Client,
): Promise<{
  workspace: ApiWorkspace
}> {
  const { name, value } = createWorkspaceVariableInput.parse(input)
  const endpoint = "/api/studio/v1/workspace/variables"
  const json = await client.requestAuthenticated(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, value }),
  })
  const { data } = createWorkspaceVariableResponseSchema.parse(json)
  return {
    workspace: data.workspace,
  }
}

/**
 * Update a workspace variable
 */
const updateWorkspaceVariableInput = z.object({
  name: z.string(),
  value: z.string(),
})
const updateWorkspaceVariableResponseSchema = z.object({
  data: z.object({
    workspace: apiWorkspaceSchema,
  }),
})

export type UpdateWorkspaceVariableInput = z.input<typeof updateWorkspaceVariableInput>
export async function updateWorkspaceVariable(
  input: UpdateWorkspaceVariableInput,
  client: ApiV1Client,
): Promise<{
  workspace: ApiWorkspace
}> {
  const { name, value } = updateWorkspaceVariableInput.parse(input)
  const endpoint = `/api/studio/v1/workspace/variables/${name}`
  const json = await client.requestAuthenticated(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, value }),
  })
  const { data } = updateWorkspaceVariableResponseSchema.parse(json)
  return {
    workspace: data.workspace,
  }
}

/**
 * Delete a workspace variable
 */
const deleteWorkspaceVariableInput = z.object({
  name: z.string(),
})

export type DeleteWorkspaceVariableInput = z.input<typeof deleteWorkspaceVariableInput>
export async function deleteWorkspaceVariable(
  input: DeleteWorkspaceVariableInput,
  client: ApiV1Client,
): Promise<void> {
  const { name } = deleteWorkspaceVariableInput.parse(input)
  const endpoint = `/api/studio/v1/workspace/variables/${name}`
  await client.requestAuthenticated(endpoint, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  })
}

/**
 * Create a workspace secret
 */
const createWorkspaceSecretInput = z.object({
  name: z.string(),
  value: z.string(),
})
const createWorkspaceSecretResponseSchema = z.object({
  data: z.object({
    workspace: apiWorkspaceSchema,
  }),
})

export type CreateWorkspaceSecretInput = z.input<typeof createWorkspaceSecretInput>
export async function createWorkspaceSecret(
  input: CreateWorkspaceSecretInput,
  client: ApiV1Client,
): Promise<{
  workspace: ApiWorkspace
}> {
  const { name, value } = createWorkspaceSecretInput.parse(input)
  const endpoint = "/api/studio/v1/workspace/secrets"
  const json = await client.requestAuthenticated(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, value }),
  })
  const { data } = createWorkspaceSecretResponseSchema.parse(json)
  return {
    workspace: data.workspace,
  }
}

/**
 * Delete a workspace secret
 */
const deleteWorkspaceSecretInput = z.object({
  name: z.string(),
})

export type DeleteWorkspaceSecretInput = z.input<typeof deleteWorkspaceSecretInput>
export async function deleteWorkspaceSecret(
  input: DeleteWorkspaceSecretInput,
  client: ApiV1Client,
): Promise<void> {
  const { name } = deleteWorkspaceSecretInput.parse(input)
  const endpoint = `/api/studio/v1/workspace/secrets/${name}`
  await client.requestAuthenticated(endpoint, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  })
}
