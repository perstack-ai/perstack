export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError }

export interface ApiError {
  code: number
  message: string
  reason?: unknown
  aborted?: boolean
}

export interface ApiClientConfig {
  apiKey?: string
  baseUrl?: string
  timeout?: number
}

export interface RequestOptions {
  signal?: AbortSignal
}

export interface PaginationParams {
  take?: number
  skip?: number
  sort?: string
  order?: "asc" | "desc"
  filter?: string
}

export interface PaginatedResult<T> {
  data: T[]
  meta: {
    total: number
    take: number
    skip: number
  }
}

/** Raw SSE event from the server */
export interface SSEEvent {
  event: string
  data: unknown
}
