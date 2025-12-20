import type { ProviderError } from "@perstack/provider-core"
import { APICallError } from "ai"

export function normalizeGoogleError(error: unknown): ProviderError {
  if (error instanceof APICallError) {
    return {
      name: error.name,
      message: error.message,
      statusCode: error.statusCode,
      isRetryable: isGoogleRetryable(error),
      provider: "google",
      originalError: error,
    }
  }
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      isRetryable: isGoogleRetryable(error),
      provider: "google",
      originalError: error,
    }
  }
  return {
    name: "UnknownError",
    message: String(error),
    isRetryable: false,
    provider: "google",
    originalError: error,
  }
}

export function isGoogleRetryable(error: unknown): boolean {
  if (error instanceof APICallError) {
    if (error.isRetryable) return true
    const statusCode = error.statusCode
    if (statusCode === 429) return true
    if (statusCode === 500) return true
    if (statusCode === 502) return true
    if (statusCode === 503) return true
    if (statusCode === 504) return true
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    if (message.includes("rate limit")) return true
    if (message.includes("quota exceeded")) return true
    if (message.includes("timeout")) return true
    if (message.includes("service unavailable")) return true
  }
  return false
}
