import { describe, expect, it } from "vitest"
import { runCommandInputSchema, startCommandInputSchema } from "./run-command.js"

describe("@perstack/core: runCommandInputSchema", () => {
  it("parses valid run command input", () => {
    const result = runCommandInputSchema.parse({
      expertKey: "test-expert",
      query: "Hello world",
      options: {},
    })
    expect(result.expertKey).toBe("test-expert")
    expect(result.query).toBe("Hello world")
  })

  it("transforms temperature string to number", () => {
    const result = runCommandInputSchema.parse({
      expertKey: "test-expert",
      query: "test",
      options: { temperature: "0.7" },
    })
    expect(result.options.temperature).toBe(0.7)
  })

  it("returns undefined for invalid temperature", () => {
    const result = runCommandInputSchema.parse({
      expertKey: "test-expert",
      query: "test",
      options: { temperature: "invalid" },
    })
    expect(result.options.temperature).toBeUndefined()
  })

  it("transforms maxSteps string to number", () => {
    const result = runCommandInputSchema.parse({
      expertKey: "test-expert",
      query: "test",
      options: { maxSteps: "10" },
    })
    expect(result.options.maxSteps).toBe(10)
  })

  it("returns undefined for invalid maxSteps", () => {
    const result = runCommandInputSchema.parse({
      expertKey: "test-expert",
      query: "test",
      options: { maxSteps: "not-a-number" },
    })
    expect(result.options.maxSteps).toBeUndefined()
  })

  it("transforms maxRetries string to number", () => {
    const result = runCommandInputSchema.parse({
      expertKey: "test-expert",
      query: "test",
      options: { maxRetries: "3" },
    })
    expect(result.options.maxRetries).toBe(3)
  })

  it("returns undefined for invalid maxRetries", () => {
    const result = runCommandInputSchema.parse({
      expertKey: "test-expert",
      query: "test",
      options: { maxRetries: "abc" },
    })
    expect(result.options.maxRetries).toBeUndefined()
  })

  it("transforms timeout string to number", () => {
    const result = runCommandInputSchema.parse({
      expertKey: "test-expert",
      query: "test",
      options: { timeout: "30000" },
    })
    expect(result.options.timeout).toBe(30000)
  })

  it("returns undefined for invalid timeout", () => {
    const result = runCommandInputSchema.parse({
      expertKey: "test-expert",
      query: "test",
      options: { timeout: "invalid" },
    })
    expect(result.options.timeout).toBeUndefined()
  })

  it("handles undefined options", () => {
    const result = runCommandInputSchema.parse({
      expertKey: "test-expert",
      query: "test",
      options: {
        temperature: undefined,
        maxSteps: undefined,
        maxRetries: undefined,
        timeout: undefined,
      },
    })
    expect(result.options.temperature).toBeUndefined()
    expect(result.options.maxSteps).toBeUndefined()
    expect(result.options.maxRetries).toBeUndefined()
    expect(result.options.timeout).toBeUndefined()
  })
})

describe("@perstack/core: startCommandInputSchema", () => {
  it("parses valid start command input", () => {
    const result = startCommandInputSchema.parse({
      expertKey: "test-expert",
      query: "Hello",
      options: {},
    })
    expect(result.expertKey).toBe("test-expert")
    expect(result.query).toBe("Hello")
  })

  it("allows optional expertKey and query", () => {
    const result = startCommandInputSchema.parse({
      options: {},
    })
    expect(result.expertKey).toBeUndefined()
    expect(result.query).toBeUndefined()
  })
})
