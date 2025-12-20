import type { LanguageModel } from "ai"
import { describe, expect, it } from "vitest"
import { BaseProviderAdapter } from "./base.js"

class TestProviderAdapter extends BaseProviderAdapter {
  readonly providerName = "anthropic" as const

  createModel(_modelId: string): LanguageModel {
    throw new Error("Not implemented")
  }
}

describe("BaseProviderAdapter", () => {
  describe("normalizeError", () => {
    it("normalizes Error instances", () => {
      const adapter = new TestProviderAdapter()
      const error = new Error("Test error")
      error.name = "TestError"
      const result = adapter.normalizeError(error)
      expect(result).toEqual({
        name: "TestError",
        message: "Test error",
        isRetryable: false,
        provider: "anthropic",
        originalError: error,
      })
    })

    it("normalizes non-Error values", () => {
      const adapter = new TestProviderAdapter()
      const result = adapter.normalizeError("string error")
      expect(result).toEqual({
        name: "UnknownError",
        message: "string error",
        isRetryable: false,
        provider: "anthropic",
        originalError: "string error",
      })
    })
  })

  describe("isRetryable", () => {
    it("returns true for rate limit errors", () => {
      const adapter = new TestProviderAdapter()
      expect(adapter.isRetryable(new Error("Rate limit exceeded"))).toBe(true)
    })

    it("returns true for timeout errors", () => {
      const adapter = new TestProviderAdapter()
      expect(adapter.isRetryable(new Error("Request timeout"))).toBe(true)
    })

    it("returns true for overloaded errors", () => {
      const adapter = new TestProviderAdapter()
      expect(adapter.isRetryable(new Error("Server overloaded"))).toBe(true)
    })

    it("returns true for service unavailable errors", () => {
      const adapter = new TestProviderAdapter()
      expect(adapter.isRetryable(new Error("Service unavailable"))).toBe(true)
    })

    it("returns true for internal server errors", () => {
      const adapter = new TestProviderAdapter()
      expect(adapter.isRetryable(new Error("Internal server error"))).toBe(true)
    })

    it("returns false for other errors", () => {
      const adapter = new TestProviderAdapter()
      expect(adapter.isRetryable(new Error("Invalid API key"))).toBe(false)
    })

    it("returns false for non-Error values", () => {
      const adapter = new TestProviderAdapter()
      expect(adapter.isRetryable("string error")).toBe(false)
    })
  })

  describe("getProviderTools", () => {
    it("returns empty object by default", () => {
      const adapter = new TestProviderAdapter()
      expect(adapter.getProviderTools(["webSearch"])).toEqual({})
    })
  })

  describe("getProviderOptions", () => {
    it("returns undefined by default", () => {
      const adapter = new TestProviderAdapter()
      expect(adapter.getProviderOptions({ skills: [] })).toBeUndefined()
    })
  })
})
