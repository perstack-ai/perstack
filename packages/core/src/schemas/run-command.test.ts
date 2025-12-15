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

describe("@perstack/core: commandOptionsSchema - envPath options", () => {
  it("transforms empty envPath array to undefined", () => {
    const result = runCommandInputSchema.parse({
      expertKey: "test-expert",
      query: "test",
      options: { envPath: [] },
    })
    expect(result.options.envPath).toBeUndefined()
  })
  it("preserves non-empty envPath array", () => {
    const result = runCommandInputSchema.parse({
      expertKey: "test-expert",
      query: "test",
      options: { envPath: [".env", ".env.local"] },
    })
    expect(result.options.envPath).toEqual([".env", ".env.local"])
  })
  it("preserves single-element envPath array", () => {
    const result = runCommandInputSchema.parse({
      expertKey: "test-expert",
      query: "test",
      options: { envPath: [".env"] },
    })
    expect(result.options.envPath).toEqual([".env"])
  })
  it("handles undefined envPath", () => {
    const result = runCommandInputSchema.parse({
      expertKey: "test-expert",
      query: "test",
      options: { envPath: undefined },
    })
    expect(result.options.envPath).toBeUndefined()
  })
})
describe("@perstack/core: commandOptionsSchema - Job options", () => {
  it("parses jobId option", () => {
    const result = runCommandInputSchema.parse({
      expertKey: "test-expert",
      query: "test",
      options: { jobId: "job-123" },
    })
    expect(result.options.jobId).toBe("job-123")
  })

  it("parses continueJob option", () => {
    const result = runCommandInputSchema.parse({
      expertKey: "test-expert",
      query: "test",
      options: { continueJob: "job-456" },
    })
    expect(result.options.continueJob).toBe("job-456")
  })

  it("parses resumeFrom option", () => {
    const result = runCommandInputSchema.parse({
      expertKey: "test-expert",
      query: "test",
      options: { resumeFrom: "checkpoint-789" },
    })
    expect(result.options.resumeFrom).toBe("checkpoint-789")
  })

  it("parses all job-related options together", () => {
    const result = runCommandInputSchema.parse({
      expertKey: "test-expert",
      query: "test",
      options: {
        jobId: "job-123",
        continueJob: "job-456",
        resumeFrom: "checkpoint-789",
        continue: true,
      },
    })
    expect(result.options.jobId).toBe("job-123")
    expect(result.options.continueJob).toBe("job-456")
    expect(result.options.resumeFrom).toBe("checkpoint-789")
    expect(result.options.continue).toBe(true)
  })
})
