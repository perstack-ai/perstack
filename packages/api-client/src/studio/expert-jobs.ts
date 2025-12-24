/**
 * Studio Expert Jobs API
 *
 * @see docs/api-reference/studio-v1/expert-jobs.md
 */
import type { Fetcher } from "../fetcher.js"
import type { ApiResult, PaginatedResult, RequestOptions } from "../types.js"
import { blobToBase64 } from "../utils.js"
import {
  type Checkpoint,
  type CheckpointStreamEvent,
  type ContinueExpertJobInput,
  checkpointStreamCompleteSchema,
  checkpointStreamErrorSchema,
  continueExpertJobResponseSchema,
  createCheckpointResponseSchema,
  createWorkspaceItemResponseSchema,
  deleteWorkspaceItemResponseSchema,
  type ExpertJob,
  findWorkspaceItemsResponseSchema,
  getCheckpointResponseSchema,
  getExpertJobResponseSchema,
  getWorkspaceInstanceResponseSchema,
  getWorkspaceItemResponseSchema,
  type ListCheckpointsParams,
  type ListExpertJobsParams,
  type ListWorkspaceItemsParams,
  listCheckpointsResponseSchema,
  listExpertJobsResponseSchema,
  listWorkspaceItemsResponseSchema,
  type StartExpertJobInput,
  startExpertJobResponseSchema,
  streamCheckpointSchema,
  type UpdateExpertJobInput,
  updateExpertJobResponseSchema,
  updateWorkspaceItemResponseSchema,
  type WorkspaceInstance,
  type WorkspaceItem,
} from "./types.js"

export interface StudioExpertJobsApi {
  get(id: string, options?: RequestOptions): Promise<ApiResult<ExpertJob>>
  list(
    params: ListExpertJobsParams,
    options?: RequestOptions,
  ): Promise<ApiResult<PaginatedResult<ExpertJob>>>
  start(input: StartExpertJobInput, options?: RequestOptions): Promise<ApiResult<ExpertJob>>
  continue(
    id: string,
    input: ContinueExpertJobInput,
    options?: RequestOptions,
  ): Promise<ApiResult<ExpertJob>>
  update(
    id: string,
    input: UpdateExpertJobInput,
    options?: RequestOptions,
  ): Promise<ApiResult<ExpertJob>>
  checkpoints: CheckpointsApi
  workspaceInstance: WorkspaceInstanceApi
}

export interface CheckpointsApi {
  get(jobId: string, checkpointId: string, options?: RequestOptions): Promise<ApiResult<Checkpoint>>
  list(
    jobId: string,
    params?: ListCheckpointsParams,
    options?: RequestOptions,
  ): Promise<ApiResult<PaginatedResult<Checkpoint>>>
  create(jobId: string, options?: RequestOptions): Promise<ApiResult<Checkpoint>>
  stream(
    jobId: string,
    options?: RequestOptions,
  ): AsyncGenerator<CheckpointStreamEvent, void, unknown>
}

export interface WorkspaceInstanceApi {
  get(jobId: string, options?: RequestOptions): Promise<ApiResult<WorkspaceInstance>>
  items: WorkspaceInstanceItemsApi
}

export interface WorkspaceInstanceItemsApi {
  get(jobId: string, itemId: string, options?: RequestOptions): Promise<ApiResult<WorkspaceItem>>
  list(
    jobId: string,
    params?: ListWorkspaceItemsParams,
    options?: RequestOptions,
  ): Promise<ApiResult<PaginatedResult<WorkspaceItem>>>
  create(
    jobId: string,
    path: string,
    content: Blob,
    options?: RequestOptions,
  ): Promise<ApiResult<WorkspaceItem>>
  update(
    jobId: string,
    itemId: string,
    content: Blob,
    options?: RequestOptions,
  ): Promise<ApiResult<WorkspaceItem>>
  delete(jobId: string, itemId: string, options?: RequestOptions): Promise<ApiResult<void>>
  download(jobId: string, itemId: string, options?: RequestOptions): Promise<ApiResult<Blob>>
  find(
    jobId: string,
    pattern: string,
    options?: RequestOptions,
  ): Promise<ApiResult<WorkspaceItem[]>>
}

export function createStudioExpertJobsApi(fetcher: Fetcher): StudioExpertJobsApi {
  return {
    async get(id, options) {
      const result = await fetcher.get(
        `/api/studio/v1/expert_jobs/${encodeURIComponent(id)}`,
        getExpertJobResponseSchema,
        options,
      )
      if (!result.ok) return result
      return { ok: true, data: result.data.data.expertJob }
    },

    async list(params, options) {
      const searchParams = new URLSearchParams()
      searchParams.set("applicationId", params.applicationId)
      if (params.filter) searchParams.set("filter", params.filter)
      if (params.sort) searchParams.set("sort", params.sort)
      if (params.order) searchParams.set("order", params.order)
      if (params.take !== undefined) searchParams.set("take", params.take.toString())
      if (params.skip !== undefined) searchParams.set("skip", params.skip.toString())

      const path = `/api/studio/v1/expert_jobs/?${searchParams.toString()}`

      const result = await fetcher.get(path, listExpertJobsResponseSchema, options)
      if (!result.ok) return result
      return {
        ok: true,
        data: {
          data: result.data.data.expertJobs,
          meta: result.data.meta,
        },
      }
    },

    async start(input, options) {
      const result = await fetcher.post(
        "/api/studio/v1/expert_jobs/",
        input,
        startExpertJobResponseSchema,
        options,
      )
      if (!result.ok) return result
      return { ok: true, data: result.data.data.expertJob }
    },

    async continue(id, input, options) {
      const result = await fetcher.post(
        `/api/studio/v1/expert_jobs/${encodeURIComponent(id)}/continue`,
        input,
        continueExpertJobResponseSchema,
        options,
      )
      if (!result.ok) return result
      return { ok: true, data: result.data.data.expertJob }
    },

    async update(id, input, options) {
      const result = await fetcher.post(
        `/api/studio/v1/expert_jobs/${encodeURIComponent(id)}`,
        input,
        updateExpertJobResponseSchema,
        options,
      )
      if (!result.ok) return result
      return { ok: true, data: result.data.data.expertJob }
    },

    checkpoints: createCheckpointsApi(fetcher),
    workspaceInstance: createWorkspaceInstanceApi(fetcher),
  }
}

function createCheckpointsApi(fetcher: Fetcher): CheckpointsApi {
  return {
    async get(jobId, checkpointId, options) {
      const result = await fetcher.get(
        `/api/studio/v1/expert_jobs/${encodeURIComponent(jobId)}/checkpoints/${encodeURIComponent(checkpointId)}`,
        getCheckpointResponseSchema,
        options,
      )
      if (!result.ok) return result
      return { ok: true, data: result.data.data.checkpoint }
    },

    async list(jobId, params, options) {
      const searchParams = new URLSearchParams()
      if (params?.take !== undefined) searchParams.set("take", params.take.toString())
      if (params?.skip !== undefined) searchParams.set("skip", params.skip.toString())
      if (params?.sort) searchParams.set("sort", params.sort)
      if (params?.order) searchParams.set("order", params.order)

      const query = searchParams.toString()
      const path = `/api/studio/v1/expert_jobs/${encodeURIComponent(jobId)}/checkpoints/${query ? `?${query}` : ""}`

      const result = await fetcher.get(path, listCheckpointsResponseSchema, options)
      if (!result.ok) return result
      return {
        ok: true,
        data: {
          data: result.data.data.checkpoints,
          meta: result.data.meta,
        },
      }
    },

    async create(jobId, options) {
      const result = await fetcher.post(
        `/api/studio/v1/expert_jobs/${encodeURIComponent(jobId)}/checkpoints/`,
        {},
        createCheckpointResponseSchema,
        options,
      )
      if (!result.ok) return result
      return { ok: true, data: result.data.data.checkpoint }
    },

    async *stream(jobId, options) {
      const path = `/api/studio/v1/expert_jobs/${encodeURIComponent(jobId)}/checkpoints/stream`
      for await (const sseEvent of fetcher.stream(path, options)) {
        if (sseEvent.event === "message") {
          const parsed = streamCheckpointSchema.safeParse(sseEvent.data)
          if (parsed.success) {
            yield { event: "message", data: parsed.data }
          }
        } else if (sseEvent.event === "error") {
          const parsed = checkpointStreamErrorSchema.safeParse(sseEvent.data)
          if (parsed.success) {
            yield { event: "error", data: parsed.data }
          }
        } else if (sseEvent.event === "complete") {
          const parsed = checkpointStreamCompleteSchema.safeParse(sseEvent.data)
          if (parsed.success) {
            yield { event: "complete", data: parsed.data }
          }
        }
      }
    },
  }
}

function createWorkspaceInstanceApi(fetcher: Fetcher): WorkspaceInstanceApi {
  return {
    async get(jobId, options) {
      const result = await fetcher.get(
        `/api/studio/v1/expert_jobs/${encodeURIComponent(jobId)}/workspace_instance/`,
        getWorkspaceInstanceResponseSchema,
        options,
      )
      if (!result.ok) return result
      return { ok: true, data: result.data.data.workspaceInstance }
    },

    items: createWorkspaceInstanceItemsApi(fetcher),
  }
}

function createWorkspaceInstanceItemsApi(fetcher: Fetcher): WorkspaceInstanceItemsApi {
  return {
    async get(jobId, itemId, options) {
      const result = await fetcher.get(
        `/api/studio/v1/expert_jobs/${encodeURIComponent(jobId)}/workspace_instance/items/${encodeURIComponent(itemId)}`,
        getWorkspaceItemResponseSchema,
        options,
      )
      if (!result.ok) return result
      return { ok: true, data: result.data.data.item }
    },

    async list(jobId, params, options) {
      const searchParams = new URLSearchParams()
      if (params?.take !== undefined) searchParams.set("take", params.take.toString())
      if (params?.skip !== undefined) searchParams.set("skip", params.skip.toString())
      if (params?.path) searchParams.set("path", params.path)

      const query = searchParams.toString()
      const path = `/api/studio/v1/expert_jobs/${encodeURIComponent(jobId)}/workspace_instance/items/${query ? `?${query}` : ""}`

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

    async create(jobId, itemPath, content, options) {
      const result = await fetcher.post(
        `/api/studio/v1/expert_jobs/${encodeURIComponent(jobId)}/workspace_instance/items/`,
        { path: itemPath, content: await blobToBase64(content) },
        createWorkspaceItemResponseSchema,
        options,
      )
      if (!result.ok) return result
      return { ok: true, data: result.data.data.item }
    },

    async update(jobId, itemId, content, options) {
      const result = await fetcher.post(
        `/api/studio/v1/expert_jobs/${encodeURIComponent(jobId)}/workspace_instance/items/${encodeURIComponent(itemId)}`,
        { content: await blobToBase64(content) },
        updateWorkspaceItemResponseSchema,
        options,
      )
      if (!result.ok) return result
      return { ok: true, data: result.data.data.item }
    },

    async delete(jobId, itemId, options) {
      const result = await fetcher.delete(
        `/api/studio/v1/expert_jobs/${encodeURIComponent(jobId)}/workspace_instance/items/${encodeURIComponent(itemId)}`,
        deleteWorkspaceItemResponseSchema,
        options,
      )
      if (!result.ok) return result
      return { ok: true, data: undefined }
    },

    async download(jobId, itemId, options) {
      return fetcher.getBlob(
        `/api/studio/v1/expert_jobs/${encodeURIComponent(jobId)}/workspace_instance/items/${encodeURIComponent(itemId)}/download`,
        options,
      )
    },

    async find(jobId, pathPattern, options) {
      const searchParams = new URLSearchParams()
      searchParams.set("path", pathPattern)

      const path = `/api/studio/v1/expert_jobs/${encodeURIComponent(jobId)}/workspace_instance/items/find?${searchParams.toString()}`

      const result = await fetcher.get(path, findWorkspaceItemsResponseSchema, options)
      if (!result.ok) return result
      return { ok: true, data: result.data.data.workspaceItems }
    },
  }
}
