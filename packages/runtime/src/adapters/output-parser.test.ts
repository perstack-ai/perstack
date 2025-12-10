import { describe, expect, it } from "vitest"
import {
  createCompleteRunEvent,
  createNormalizedCheckpoint,
  createRuntimeInitEvent,
  parseExternalOutput,
} from "./output-parser.js"

describe("parseExternalOutput", () => {
  describe("cursor", () => {
    it("returns trimmed output", () => {
      const result = parseExternalOutput("  Hello World  \n", "cursor")
      expect(result.finalOutput).toBe("Hello World")
      expect(result.events).toHaveLength(0)
    })
  })

  describe("claude-code", () => {
    it("extracts text from JSON output", () => {
      const input = '{"type": "result", "content": "Hello World"}'
      const result = parseExternalOutput(input, "claude-code")
      expect(result.finalOutput).toBe("Hello World")
    })

    it("falls back to raw output for non-JSON", () => {
      const input = "Plain text output"
      const result = parseExternalOutput(input, "claude-code")
      expect(result.finalOutput).toBe("Plain text output")
    })
  })

  describe("gemini", () => {
    it("returns trimmed output", () => {
      const result = parseExternalOutput("  Hello World  \n", "gemini")
      expect(result.finalOutput).toBe("Hello World")
      expect(result.events).toHaveLength(0)
    })
  })
})

describe("createNormalizedCheckpoint", () => {
  it("creates valid checkpoint structure", () => {
    const checkpoint = createNormalizedCheckpoint({
      jobId: "job-123",
      runId: "run-456",
      expertKey: "test-expert",
      expert: { key: "test-expert", name: "Test", version: "1.0.0" },
      output: "Hello World",
      runtime: "cursor",
    })
    expect(checkpoint.jobId).toBe("job-123")
    expect(checkpoint.runId).toBe("run-456")
    expect(checkpoint.status).toBe("completed")
    expect(checkpoint.stepNumber).toBe(1)
    expect(checkpoint.messages).toHaveLength(1)
    expect(checkpoint.messages[0].type).toBe("expertMessage")
    expect(checkpoint.metadata?.runtime).toBe("cursor")
    expect(checkpoint.metadata?.externalExecution).toBe(true)
  })
})

describe("createRuntimeInitEvent", () => {
  it("creates valid init event", () => {
    const event = createRuntimeInitEvent("job-123", "run-456", "Test Expert", "cursor")
    expect(event.type).toBe("initializeRuntime")
    expect(event.jobId).toBe("job-123")
    expect(event.runId).toBe("run-456")
  })
})

describe("createCompleteRunEvent", () => {
  it("creates valid complete event", () => {
    const checkpoint = createNormalizedCheckpoint({
      jobId: "job-123",
      runId: "run-456",
      expertKey: "test-expert",
      expert: { key: "test-expert", name: "Test", version: "1.0.0" },
      output: "Done",
      runtime: "cursor",
    })
    const event = createCompleteRunEvent("job-123", "run-456", "test-expert", checkpoint, "Done")
    expect(event.type).toBe("completeRun")
  })
})
