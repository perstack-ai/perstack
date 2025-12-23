/**
 * Studio Experts API
 *
 * @see docs/api-reference/studio-v1/experts.md
 */
import type { Fetcher } from "../fetcher.js"
import type { ApiResult, PaginatedResult, RequestOptions } from "../types.js"
import {
  type CreateStudioExpertInput,
  createStudioExpertResponseSchema,
  deleteStudioExpertResponseSchema,
  type ExpertDigest,
  getStudioExpertResponseSchema,
  type ListStudioExpertsParams,
  listStudioExpertsResponseSchema,
  type StudioExpert,
  type UpdateStudioExpertInput,
  updateStudioExpertResponseSchema,
} from "./types.js"

export interface StudioExpertsApi {
  get(key: string, options?: RequestOptions): Promise<ApiResult<StudioExpert>>
  list(
    params: ListStudioExpertsParams,
    options?: RequestOptions,
  ): Promise<ApiResult<PaginatedResult<ExpertDigest>>>
  create(input: CreateStudioExpertInput, options?: RequestOptions): Promise<ApiResult<StudioExpert>>
  update(
    key: string,
    input: UpdateStudioExpertInput,
    options?: RequestOptions,
  ): Promise<ApiResult<StudioExpert>>
  delete(key: string, options?: RequestOptions): Promise<ApiResult<void>>
}

export function createStudioExpertsApi(fetcher: Fetcher): StudioExpertsApi {
  return {
    async get(key, options) {
      const result = await fetcher.get(
        `/api/studio/v1/experts/${encodeURIComponent(key)}`,
        getStudioExpertResponseSchema,
        options,
      )
      if (!result.ok) return result
      return { ok: true, data: result.data.data.expert }
    },

    async list(params, options) {
      const searchParams = new URLSearchParams()
      searchParams.set("applicationId", params.applicationId)
      if (params.filter) searchParams.set("filter", params.filter)
      if (params.sort) searchParams.set("sort", params.sort)
      if (params.order) searchParams.set("order", params.order)
      if (params.take !== undefined) searchParams.set("take", params.take.toString())
      if (params.skip !== undefined) searchParams.set("skip", params.skip.toString())

      const path = `/api/studio/v1/experts/?${searchParams.toString()}`

      const result = await fetcher.get(path, listStudioExpertsResponseSchema, options)
      if (!result.ok) return result
      return {
        ok: true,
        data: {
          data: result.data.data.experts,
          meta: result.data.meta,
        },
      }
    },

    async create(input, options) {
      const result = await fetcher.post(
        "/api/studio/v1/experts/",
        input,
        createStudioExpertResponseSchema,
        options,
      )
      if (!result.ok) return result
      return { ok: true, data: result.data.data.expert }
    },

    async update(key, input, options) {
      const result = await fetcher.post(
        `/api/studio/v1/experts/${encodeURIComponent(key)}`,
        input,
        updateStudioExpertResponseSchema,
        options,
      )
      if (!result.ok) return result
      return { ok: true, data: result.data.data.expert }
    },

    async delete(key, options) {
      const result = await fetcher.delete(
        `/api/studio/v1/experts/${encodeURIComponent(key)}`,
        deleteStudioExpertResponseSchema,
        options,
      )
      if (!result.ok) return result
      return { ok: true, data: undefined }
    },
  }
}
