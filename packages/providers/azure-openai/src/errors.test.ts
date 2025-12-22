import { APICallError } from "ai"
import { describe, expect, it } from "vitest"
import { isAzureOpenAIRetryable, normalizeAzureOpenAIError } from "./errors.js"

describe("normalizeAzureOpenAIError", () => {
  it("normalizes APICallError", () => {
    const error = new APICallError({
      message: "Rate limit exceeded",
      url: "https://example.openai.azure.com/openai/deployments/test",
      requestBodyValues: {},
      statusCode: 429,
      responseHeaders: {},
      responseBody: "Rate limit exceeded",
      isRetryable: true,
      data: undefined,
    })
    const result = normalizeAzureOpenAIError(error)
    expect(result.name).toBe("AI_APICallError")
    expect(result.message).toBe("Rate limit exceeded")
    expect(result.statusCode).toBe(429)
    expect(result.isRetryable).toBe(true)
    expect(result.provider).toBe("azure-openai")
  })

  it("normalizes regular Error", () => {
    const error = new Error("Connection failed")
    const result = normalizeAzureOpenAIError(error)
    expect(result.name).toBe("Error")
    expect(result.message).toBe("Connection failed")
    expect(result.statusCode).toBeUndefined()
    expect(result.isRetryable).toBe(false)
    expect(result.provider).toBe("azure-openai")
  })

  it("normalizes non-Error values", () => {
    const result = normalizeAzureOpenAIError("string error")
    expect(result.name).toBe("UnknownError")
    expect(result.message).toBe("string error")
    expect(result.isRetryable).toBe(false)
    expect(result.provider).toBe("azure-openai")
  })
})

describe("isAzureOpenAIRetryable", () => {
  it("returns true for APICallError with isRetryable flag", () => {
    const error = new APICallError({
      message: "Error",
      url: "https://example.openai.azure.com/openai/deployments/test",
      requestBodyValues: {},
      statusCode: 500,
      responseHeaders: {},
      responseBody: "Error",
      isRetryable: true,
      data: undefined,
    })
    expect(isAzureOpenAIRetryable(error)).toBe(true)
  })

  it("returns true for 429 status code", () => {
    const error = new APICallError({
      message: "Rate limit",
      url: "https://example.openai.azure.com/openai/deployments/test",
      requestBodyValues: {},
      statusCode: 429,
      responseHeaders: {},
      responseBody: "Rate limit",
      isRetryable: false,
      data: undefined,
    })
    expect(isAzureOpenAIRetryable(error)).toBe(true)
  })

  it("returns true for 500 status code", () => {
    const error = new APICallError({
      message: "Internal error",
      url: "https://example.openai.azure.com/openai/deployments/test",
      requestBodyValues: {},
      statusCode: 500,
      responseHeaders: {},
      responseBody: "Internal error",
      isRetryable: false,
      data: undefined,
    })
    expect(isAzureOpenAIRetryable(error)).toBe(true)
  })

  it("returns true for 503 status code", () => {
    const error = new APICallError({
      message: "Service unavailable",
      url: "https://example.openai.azure.com/openai/deployments/test",
      requestBodyValues: {},
      statusCode: 503,
      responseHeaders: {},
      responseBody: "Service unavailable",
      isRetryable: false,
      data: undefined,
    })
    expect(isAzureOpenAIRetryable(error)).toBe(true)
  })

  it("returns false for 400 status code", () => {
    const error = new APICallError({
      message: "Bad request",
      url: "https://example.openai.azure.com/openai/deployments/test",
      requestBodyValues: {},
      statusCode: 400,
      responseHeaders: {},
      responseBody: "Bad request",
      isRetryable: false,
      data: undefined,
    })
    expect(isAzureOpenAIRetryable(error)).toBe(false)
  })

  it("returns true for rate limit message", () => {
    const error = new Error("Rate limit exceeded")
    expect(isAzureOpenAIRetryable(error)).toBe(true)
  })

  it("returns true for timeout message", () => {
    const error = new Error("Request timeout")
    expect(isAzureOpenAIRetryable(error)).toBe(true)
  })

  it("returns false for non-Error values", () => {
    expect(isAzureOpenAIRetryable("string error")).toBe(false)
  })
})
