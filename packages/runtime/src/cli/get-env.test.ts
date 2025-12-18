import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { getEnv } from "./get-env.js"

describe("@perstack/runtime: getEnv", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    // Reset process.env to a clean state
    for (const key of Object.keys(process.env)) {
      if (!originalEnv[key]) {
        delete process.env[key]
      }
    }
    Object.assign(process.env, originalEnv)
  })

  afterEach(() => {
    // Restore original process.env
    for (const key of Object.keys(process.env)) {
      if (!originalEnv[key]) {
        delete process.env[key]
      }
    }
    Object.assign(process.env, originalEnv)
  })

  it("returns env variables from process.env", () => {
    process.env.TEST_VAR = "test-value"
    const env = getEnv([])
    expect(env.TEST_VAR).toBe("test-value")
    delete process.env.TEST_VAR
  })

  it("filters out undefined values from process.env", () => {
    const env = getEnv([])
    for (const value of Object.values(env)) {
      expect(value).toBeDefined()
      expect(typeof value).toBe("string")
    }
  })

  it("accepts empty envPath array", () => {
    const env = getEnv([])
    expect(typeof env).toBe("object")
  })

  it("returns object with string values only", () => {
    process.env.STRING_VAR = "string-value"
    const env = getEnv([])
    expect(typeof env.STRING_VAR).toBe("string")
    delete process.env.STRING_VAR
  })

  it("handles multiple envPath files gracefully", () => {
    // Even with non-existent files, should not throw
    const env = getEnv([".env.nonexistent", ".env.also-nonexistent"])
    expect(typeof env).toBe("object")
  })
})
