import type { ZodType } from "zod"
import type { ApiClientConfig, ApiError, ApiResult, RequestOptions } from "./types.js"

const DEFAULT_BASE_URL = "https://api.perstack.ai"
const DEFAULT_TIMEOUT = 30000

export interface Fetcher {
  get<T>(path: string, schema: ZodType<T>, options?: RequestOptions): Promise<ApiResult<T>>
  post<T>(
    path: string,
    body: unknown,
    schema: ZodType<T>,
    options?: RequestOptions,
  ): Promise<ApiResult<T>>
  delete<T>(path: string, schema: ZodType<T>, options?: RequestOptions): Promise<ApiResult<T>>
  getBlob(path: string, options?: RequestOptions): Promise<ApiResult<Blob>>
}

function createAbortError(): ApiError {
  return {
    code: 0,
    message: "Request aborted",
    aborted: true,
  }
}

function createNetworkError(error: unknown): ApiError {
  return {
    code: 0,
    message: error instanceof Error ? error.message : "Network error",
    reason: error,
  }
}

function createHttpError(status: number, statusText: string, body?: unknown): ApiError {
  if (typeof body === "object" && body !== null) {
    const errorBody = body as Record<string, unknown>
    return {
      code: status,
      message: (errorBody.error as string) ?? statusText,
      reason: errorBody.reason,
    }
  }
  return {
    code: status,
    message: statusText,
  }
}

function createValidationError(error: unknown): ApiError {
  return {
    code: 0,
    message: "Response validation failed",
    reason: error,
  }
}

export function createFetcher(config?: ApiClientConfig): Fetcher {
  const baseUrl = config?.baseUrl ?? DEFAULT_BASE_URL
  const timeout = config?.timeout ?? DEFAULT_TIMEOUT
  const apiKey = config?.apiKey

  function buildUrl(path: string): string {
    return `${baseUrl}${path}`
  }

  function buildHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...additionalHeaders,
    }
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`
    }
    return headers
  }

  function createTimeoutSignal(externalSignal?: AbortSignal): {
    signal: AbortSignal
    cleanup: () => void
  } {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    if (externalSignal) {
      if (externalSignal.aborted) {
        controller.abort()
      } else {
        externalSignal.addEventListener("abort", () => controller.abort())
      }
    }

    return {
      signal: controller.signal,
      cleanup: () => clearTimeout(timeoutId),
    }
  }

  async function request<T>(
    method: string,
    path: string,
    schema: ZodType<T>,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<ApiResult<T>> {
    const { signal, cleanup } = createTimeoutSignal(options?.signal)

    try {
      const response = await fetch(buildUrl(path), {
        method,
        headers: buildHeaders(),
        body: body ? JSON.stringify(body) : undefined,
        signal,
      })

      if (!response.ok) {
        let errorBody: unknown
        try {
          errorBody = await response.json()
        } catch {
          errorBody = undefined
        }
        return {
          ok: false,
          error: createHttpError(response.status, response.statusText, errorBody),
        }
      }

      const json = await response.json()
      const parsed = schema.safeParse(json)

      if (!parsed.success) {
        return { ok: false, error: createValidationError(parsed.error) }
      }

      return { ok: true, data: parsed.data }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return { ok: false, error: createAbortError() }
      }
      return { ok: false, error: createNetworkError(error) }
    } finally {
      cleanup()
    }
  }

  async function requestBlob(path: string, options?: RequestOptions): Promise<ApiResult<Blob>> {
    const { signal, cleanup } = createTimeoutSignal(options?.signal)

    try {
      const response = await fetch(buildUrl(path), {
        method: "GET",
        headers: buildHeaders(),
        signal,
      })

      if (!response.ok) {
        let errorBody: unknown
        try {
          errorBody = await response.json()
        } catch {
          errorBody = undefined
        }
        return {
          ok: false,
          error: createHttpError(response.status, response.statusText, errorBody),
        }
      }

      const blob = await response.blob()
      return { ok: true, data: blob }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return { ok: false, error: createAbortError() }
      }
      return { ok: false, error: createNetworkError(error) }
    } finally {
      cleanup()
    }
  }

  return {
    get: <T>(path: string, schema: ZodType<T>, options?: RequestOptions) =>
      request("GET", path, schema, undefined, options),
    post: <T>(path: string, body: unknown, schema: ZodType<T>, options?: RequestOptions) =>
      request("POST", path, schema, body, options),
    delete: <T>(path: string, schema: ZodType<T>, options?: RequestOptions) =>
      request("DELETE", path, schema, undefined, options),
    getBlob: (path: string, options?: RequestOptions) => requestBlob(path, options),
  }
}
