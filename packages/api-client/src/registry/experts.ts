/**
 * Registry Experts API
 *
 * @see docs/api-reference/registry-v1/experts.md
 */
import type { Fetcher } from "../fetcher.js"
import type { ApiResult, PaginatedResult, RequestOptions } from "../types.js"
import {
  type CreateExpertInput,
  createExpertResponseSchema,
  deleteExpertResponseSchema,
  type ExpertDigest,
  getExpertResponseSchema,
  getExpertVersionsResponseSchema,
  type ListExpertsParams,
  listExpertsResponseSchema,
  type RegistryExpert,
  type UpdateExpertInput,
  updateExpertResponseSchema,
} from "./types.js"

export interface RegistryExpertsApi {
  get(key: string, options?: RequestOptions): Promise<ApiResult<RegistryExpert>>
  list(
    params?: ListExpertsParams,
    options?: RequestOptions,
  ): Promise<ApiResult<PaginatedResult<RegistryExpert>>>
  create(input: CreateExpertInput, options?: RequestOptions): Promise<ApiResult<RegistryExpert>>
  update(
    key: string,
    input: UpdateExpertInput,
    options?: RequestOptions,
  ): Promise<ApiResult<RegistryExpert>>
  delete(key: string, options?: RequestOptions): Promise<ApiResult<void>>
  getVersions(
    key: string,
    options?: RequestOptions,
  ): Promise<ApiResult<{ versions: ExpertDigest[]; latest: string; total: number }>>
}

export function createRegistryExpertsApi(fetcher: Fetcher): RegistryExpertsApi {
  return {
    async get(key, options) {
      const result = await fetcher.get(
        `/api/registry/v1/experts/${encodeURIComponent(key)}`,
        getExpertResponseSchema,
        options,
      )
      if (!result.ok) return result
      return { ok: true, data: result.data.data.expert }
    },

    async list(params, options) {
      const searchParams = new URLSearchParams()
      if (params?.organizationId) searchParams.set("organizationId", params.organizationId)
      if (params?.filter) searchParams.set("filter", params.filter)
      if (params?.sort) searchParams.set("sort", params.sort)
      if (params?.order) searchParams.set("order", params.order)
      if (params?.take !== undefined) searchParams.set("take", params.take.toString())
      if (params?.skip !== undefined) searchParams.set("skip", params.skip.toString())

      const query = searchParams.toString()
      const path = `/api/registry/v1/experts/${query ? `?${query}` : ""}`

      const result = await fetcher.get(path, listExpertsResponseSchema, options)
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
        "/api/registry/v1/experts/",
        input,
        createExpertResponseSchema,
        options,
      )
      if (!result.ok) return result
      return { ok: true, data: result.data.data.expert }
    },

    async update(key, input, options) {
      const result = await fetcher.post(
        `/api/registry/v1/experts/${encodeURIComponent(key)}`,
        input,
        updateExpertResponseSchema,
        options,
      )
      if (!result.ok) return result
      return { ok: true, data: result.data.data.expert }
    },

    async delete(key, options) {
      const result = await fetcher.delete(
        `/api/registry/v1/experts/${encodeURIComponent(key)}`,
        deleteExpertResponseSchema,
        options,
      )
      if (!result.ok) return result
      return { ok: true, data: undefined }
    },

    async getVersions(key, options) {
      const result = await fetcher.get(
        `/api/registry/v1/experts/${encodeURIComponent(key)}/versions`,
        getExpertVersionsResponseSchema,
        options,
      )
      if (!result.ok) return result
      return {
        ok: true,
        data: {
          versions: result.data.data.versions,
          latest: result.data.data.latest,
          total: result.data.meta.total,
        },
      }
    },
  }
}
