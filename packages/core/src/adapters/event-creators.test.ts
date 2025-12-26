import { describe, expect, it } from "vitest"
import {
  createCallToolsEvent,
  createCompleteRunEvent,
  createEmptyUsage,
  createNormalizedCheckpoint,
  createResolveToolResultsEvent,
  createRuntimeInitEvent,
  createStartRunEvent,
  createToolMessage,
} from "./event-creators.js"

describe("@perstack/core: event-creators", () => {
  describe("createEmptyUsage", () => {
    it("returns usage with all zeros", () => {
      const usage = createEmptyUsage()
      expect(usage).toEqual({
        inputTokens: 0,
        outputTokens: 0,
        reasoningTokens: 0,
        totalTokens: 0,
        cachedInputTokens: 0,
      })
    })
  })

  describe("createNormalizedCheckpoint", () => {
    it("creates checkpoint with correct structure", () => {
      const checkpoint = createNormalizedCheckpoint({
        jobId: "job-1",
        runId: "run-1",
        expertKey: "expert-key",
        expert: { key: "expert-key", name: "Test Expert", version: "1.0.0" },
        output: "Hello, world!",
        runtime: "cursor",
      })
      expect(checkpoint.jobId).toBe("job-1")
      expect(checkpoint.runId).toBe("run-1")
      expect(checkpoint.status).toBe("completed")
      expect(checkpoint.stepNumber).toBe(1)
      expect(checkpoint.expert.name).toBe("Test Expert")
      expect(checkpoint.messages).toHaveLength(1)
      expect(checkpoint.messages[0].type).toBe("expertMessage")
      expect(checkpoint.metadata?.runtime).toBe("cursor")
    })
  })

  describe("createRuntimeInitEvent", () => {
    it("creates runtime init event", () => {
      const event = createRuntimeInitEvent(
        "job-1",
        "run-1",
        "Test Expert",
        "cursor",
        "1.0.0",
        "What is 2+2?",
      )
      expect(event.type).toBe("initializeRuntime")
      expect(event.jobId).toBe("job-1")
      expect(event.runId).toBe("run-1")
      if (event.type === "initializeRuntime") {
        expect(event.runtime).toBe("cursor")
        expect(event.expertName).toBe("Test Expert")
        expect(event.query).toBe("What is 2+2?")
      }
    })

    it("creates event without query", () => {
      const event = createRuntimeInitEvent("job-1", "run-1", "Expert", "local", "1.0.0")
      if (event.type === "initializeRuntime") {
        expect(event.query).toBeUndefined()
      }
    })
  })

  describe("createStartRunEvent", () => {
    it("creates start run event", () => {
      const checkpoint = createNormalizedCheckpoint({
        jobId: "job-1",
        runId: "run-1",
        expertKey: "expert-key",
        expert: { key: "expert-key", name: "Expert", version: "1.0.0" },
        output: "",
        runtime: "cursor",
      })
      const initCheckpoint = { ...checkpoint, status: "init" as const, stepNumber: 0 }
      const event = createStartRunEvent("job-1", "run-1", "expert-key", initCheckpoint)
      expect(event.type).toBe("startRun")
      expect(event.jobId).toBe("job-1")
      expect(event.runId).toBe("run-1")
      expect(event.expertKey).toBe("expert-key")
      if (event.type === "startRun") {
        expect(event.initialCheckpoint).toBe(initCheckpoint)
        expect(event.inputMessages).toEqual([])
      }
    })
  })

  describe("createCompleteRunEvent", () => {
    it("creates complete run event", () => {
      const checkpoint = createNormalizedCheckpoint({
        jobId: "job-1",
        runId: "run-1",
        expertKey: "expert-key",
        expert: { key: "expert-key", name: "Expert", version: "1.0.0" },
        output: "Result",
        runtime: "local",
      })
      const event = createCompleteRunEvent("job-1", "run-1", "expert-key", checkpoint, "Result")
      expect(event.type).toBe("completeRun")
      expect(event.expertKey).toBe("expert-key")
      if (event.type === "completeRun") {
        expect(event.text).toBe("Result")
        expect(event.checkpoint).toBe(checkpoint)
      }
    })
  })

  describe("createCallToolsEvent", () => {
    it("creates call tools event", () => {
      const checkpoint = createNormalizedCheckpoint({
        jobId: "job-1",
        runId: "run-1",
        expertKey: "expert",
        expert: { key: "expert", name: "Expert", version: "1.0.0" },
        output: "",
        runtime: "local",
      })
      const toolCalls = [{ id: "tc-1", skillName: "skill", toolName: "tool", input: {}, args: {} }]
      const event = createCallToolsEvent("job-1", "run-1", "expert", 1, toolCalls, checkpoint)
      expect(event.type).toBe("callTools")
      if (event.type === "callTools") {
        expect(event.toolCalls).toBe(toolCalls)
      }
    })
  })

  describe("createResolveToolResultsEvent", () => {
    it("creates resolve tool results event", () => {
      const toolResults = [
        {
          id: "tr-1",
          skillName: "skill",
          toolName: "tool",
          result: [{ type: "textPart" as const, id: "p-1", text: "result" }],
        },
      ]
      const event = createResolveToolResultsEvent("job-1", "run-1", "expert", 1, toolResults)
      expect(event.type).toBe("resolveToolResults")
      if (event.type === "resolveToolResults") {
        expect(event.toolResults).toBe(toolResults)
      }
    })
  })

  describe("createToolMessage", () => {
    it("creates tool message", () => {
      const message = createToolMessage("tc-1", "myTool", "Tool result text")
      expect(message.type).toBe("toolMessage")
      expect(message.contents).toHaveLength(1)
      expect(message.contents[0].type).toBe("toolResultPart")
    })
  })
})
