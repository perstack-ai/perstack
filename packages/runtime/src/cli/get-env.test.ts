import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { getEnv } from "./get-env.js"

describe("@perstack/runtime: getEnv", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    // Clear process.env for each test
    for (const key of Object.keys(process.env)) {
      delete process.env[key]
    }
  })

  afterEach(() => {
    // Restore original env
    for (const key of Object.keys(process.env)) {
      delete process.env[key]
    }
    Object.assign(process.env, originalEnv)
  })

  it("returns empty object when process.env is empty", () => {
    const env = getEnv([])
    expect(env).toEqual({})
  })

  it("includes process.env variables", () => {
    process.env.TEST_VAR = "test-value"
    process.env.ANOTHER_VAR = "another-value"

    const env = getEnv([])

    expect(env.TEST_VAR).toBe("test-value")
    expect(env.ANOTHER_VAR).toBe("another-value")
  })

  it("filters out undefined values from process.env", () => {
    process.env.DEFINED_VAR = "defined"
    process.env.EMPTY_VAR = ""

    const env = getEnv([])

    expect(env.DEFINED_VAR).toBe("defined")
    expect(env.EMPTY_VAR).toBeUndefined()
  })

  it("accepts envPath parameter", () => {
    // Test that the function accepts paths without throwing
    const env = getEnv([".env", ".env.local"])
    expect(env).toBeDefined()
  })

  it("returns object with string values", () => {
    process.env.STRING_VAR = "string-value"

    const env = getEnv([])

    expect(typeof env.STRING_VAR).toBe("string")
  })
})
