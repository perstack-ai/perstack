import { describe, expect, it } from "vitest"
import { ApiError } from "./api-error.js"

describe("@perstack/api-client: ApiError", () => {
  it("parses valid JSON response", () => {
    const responseText = JSON.stringify({
      code: 404,
      error: "Not Found",
      reason: "Resource not found",
    })
    const error = new ApiError(responseText)
    expect(error.code).toBe(404)
    expect(error.error).toBe("Not Found")
    expect(error.reason).toBe("Resource not found")
    expect(error.message).toBe("404 Not Found: Resource not found")
    expect(error.name).toBe("ApiError")
  })

  it("handles invalid JSON response", () => {
    const responseText = "Invalid response body"
    const error = new ApiError(responseText)
    expect(error.code).toBe(500)
    expect(error.error).toBe("Unknown error")
    expect(error.reason).toBe("Invalid response body")
    expect(error.message).toBe("500 Unknown error: Invalid response body")
  })

  it("handles partial JSON response", () => {
    const responseText = JSON.stringify({ code: 401 })
    const error = new ApiError(responseText)
    expect(error.code).toBe(401)
    expect(error.error).toBe("Unknown error")
    expect(error.reason).toBe(responseText)
  })

  it("handles empty JSON response", () => {
    const responseText = "{}"
    const error = new ApiError(responseText)
    expect(error.code).toBe(500)
    expect(error.error).toBe("Unknown error")
    expect(error.reason).toBe("{}")
  })

  it("extends Error class", () => {
    const error = new ApiError("{}")
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(ApiError)
  })

  it("has stack trace", () => {
    const error = new ApiError("{}")
    expect(error.stack).toBeDefined()
  })
})

