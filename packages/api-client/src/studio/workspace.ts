/**
 * Studio Workspace API
 *
 * @see docs/api-reference/studio-v1/workspace.md
 */
import type { Fetcher } from "../fetcher.js"
import type { ApiResult, PaginatedResult, RequestOptions } from "../types.js"
import { blobToBase64 } from "../utils.js"
import {
  type CreateWorkspaceSecretInput,
  type CreateWorkspaceVariableInput,
  createWorkspaceItemResponseSchema,
  createWorkspaceSecretResponseSchema,
  createWorkspaceVariableResponseSchema,
  deleteWorkspaceItemResponseSchema,
  deleteWorkspaceSecretResponseSchema,
  deleteWorkspaceVariableResponseSchema,
  findWorkspaceItemsResponseSchema,
  getWorkspaceItemResponseSchema,
  getWorkspaceResponseSchema,
  type ListWorkspaceItemsParams,
  listWorkspaceItemsResponseSchema,
  type UpdateWorkspaceVariableInput,
  updateWorkspaceItemResponseSchema,
  updateWorkspaceVariableResponseSchema,
  type Workspace,
  type WorkspaceItem,
  type WorkspaceSecret,
  type WorkspaceVariable,
} from "./types.js"

export interface StudioWorkspaceApi {
  get(options?: RequestOptions): Promise<ApiResult<Workspace>>
  items: WorkspaceItemsApi
  variables: WorkspaceVariablesApi
  secrets: WorkspaceSecretsApi
}

export interface WorkspaceItemsApi {
  get(itemId: string, options?: RequestOptions): Promise<ApiResult<WorkspaceItem>>
  list(
    params?: ListWorkspaceItemsParams,
    options?: RequestOptions,
  ): Promise<ApiResult<PaginatedResult<WorkspaceItem>>>
  create(path: string, content: Blob, options?: RequestOptions): Promise<ApiResult<WorkspaceItem>>
  update(itemId: string, content: Blob, options?: RequestOptions): Promise<ApiResult<WorkspaceItem>>
  delete(itemId: string, options?: RequestOptions): Promise<ApiResult<void>>
  download(itemId: string, options?: RequestOptions): Promise<ApiResult<Blob>>
  find(pattern: string, options?: RequestOptions): Promise<ApiResult<WorkspaceItem[]>>
}

export interface WorkspaceVariablesApi {
  create(
    input: CreateWorkspaceVariableInput,
    options?: RequestOptions,
  ): Promise<ApiResult<WorkspaceVariable>>
  update(
    name: string,
    input: UpdateWorkspaceVariableInput,
    options?: RequestOptions,
  ): Promise<ApiResult<WorkspaceVariable>>
  delete(name: string, options?: RequestOptions): Promise<ApiResult<void>>
}

export interface WorkspaceSecretsApi {
  create(
    input: CreateWorkspaceSecretInput,
    options?: RequestOptions,
  ): Promise<ApiResult<WorkspaceSecret>>
  delete(name: string, options?: RequestOptions): Promise<ApiResult<void>>
}

export function createStudioWorkspaceApi(fetcher: Fetcher): StudioWorkspaceApi {
  return {
    async get(options) {
      const result = await fetcher.get(
        "/api/studio/v1/workspace/",
        getWorkspaceResponseSchema,
        options,
      )
      if (!result.ok) return result
      return { ok: true, data: result.data.data.workspace }
    },

    items: createWorkspaceItemsApi(fetcher),
    variables: createWorkspaceVariablesApi(fetcher),
    secrets: createWorkspaceSecretsApi(fetcher),
  }
}

function createWorkspaceItemsApi(fetcher: Fetcher): WorkspaceItemsApi {
  return {
    async get(itemId, options) {
      const result = await fetcher.get(
        `/api/studio/v1/workspace/items/${encodeURIComponent(itemId)}`,
        getWorkspaceItemResponseSchema,
        options,
      )
      if (!result.ok) return result
      return { ok: true, data: result.data.data.item }
    },

    async list(params, options) {
      const searchParams = new URLSearchParams()
      if (params?.take !== undefined) searchParams.set("take", params.take.toString())
      if (params?.skip !== undefined) searchParams.set("skip", params.skip.toString())
      if (params?.path) searchParams.set("path", params.path)

      const query = searchParams.toString()
      const path = `/api/studio/v1/workspace/items/${query ? `?${query}` : ""}`

      const result = await fetcher.get(path, listWorkspaceItemsResponseSchema, options)
      if (!result.ok) return result
      return {
        ok: true,
        data: {
          data: result.data.data.workspaceItems,
          meta: result.data.meta,
        },
      }
    },

    async create(itemPath, content, options) {
      const result = await fetcher.post(
        "/api/studio/v1/workspace/items/",
        { path: itemPath, content: await blobToBase64(content) },
        createWorkspaceItemResponseSchema,
        options,
      )
      if (!result.ok) return result
      return { ok: true, data: result.data.data.item }
    },

    async update(itemId, content, options) {
      const result = await fetcher.post(
        `/api/studio/v1/workspace/items/${encodeURIComponent(itemId)}`,
        { content: await blobToBase64(content) },
        updateWorkspaceItemResponseSchema,
        options,
      )
      if (!result.ok) return result
      return { ok: true, data: result.data.data.item }
    },

    async delete(itemId, options) {
      const result = await fetcher.delete(
        `/api/studio/v1/workspace/items/${encodeURIComponent(itemId)}`,
        deleteWorkspaceItemResponseSchema,
        options,
      )
      if (!result.ok) return result
      return { ok: true, data: undefined }
    },

    async download(itemId, options) {
      return fetcher.getBlob(
        `/api/studio/v1/workspace/items/${encodeURIComponent(itemId)}/download`,
        options,
      )
    },

    async find(pathPattern, options) {
      const searchParams = new URLSearchParams()
      searchParams.set("path", pathPattern)

      const path = `/api/studio/v1/workspace/items/find?${searchParams.toString()}`

      const result = await fetcher.get(path, findWorkspaceItemsResponseSchema, options)
      if (!result.ok) return result
      return { ok: true, data: result.data.data.workspaceItems }
    },
  }
}

function createWorkspaceVariablesApi(fetcher: Fetcher): WorkspaceVariablesApi {
  return {
    async create(input, options) {
      const result = await fetcher.post(
        "/api/studio/v1/workspace/variables/",
        input,
        createWorkspaceVariableResponseSchema,
        options,
      )
      if (!result.ok) return result
      return { ok: true, data: result.data.data.variable }
    },

    async update(name, input, options) {
      const result = await fetcher.post(
        `/api/studio/v1/workspace/variables/${encodeURIComponent(name)}`,
        input,
        updateWorkspaceVariableResponseSchema,
        options,
      )
      if (!result.ok) return result
      return { ok: true, data: result.data.data.variable }
    },

    async delete(name, options) {
      const result = await fetcher.delete(
        `/api/studio/v1/workspace/variables/${encodeURIComponent(name)}`,
        deleteWorkspaceVariableResponseSchema,
        options,
      )
      if (!result.ok) return result
      return { ok: true, data: undefined }
    },
  }
}

function createWorkspaceSecretsApi(fetcher: Fetcher): WorkspaceSecretsApi {
  return {
    async create(input, options) {
      const result = await fetcher.post(
        "/api/studio/v1/workspace/secrets/",
        input,
        createWorkspaceSecretResponseSchema,
        options,
      )
      if (!result.ok) return result
      return { ok: true, data: result.data.data.secret }
    },

    async delete(name, options) {
      const result = await fetcher.delete(
        `/api/studio/v1/workspace/secrets/${encodeURIComponent(name)}`,
        deleteWorkspaceSecretResponseSchema,
        options,
      )
      if (!result.ok) return result
      return { ok: true, data: undefined }
    },
  }
}
