import { createId } from "@paralleldrive/cuid2"
import type { Checkpoint, Job, RunEvent, RunSetting, Usage } from "@perstack/core"
import { describe, expect, it } from "vitest"
import {
  deserializeCheckpoint,
  deserializeEvent,
  deserializeJob,
  deserializeRunSetting,
  serializeCheckpoint,
  serializeEvent,
  serializeJob,
  serializeRunSetting,
} from "./serialization.js"

function createEmptyUsage(): Usage {
  return {
    inputTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    totalTokens: 0,
    cachedInputTokens: 0,
  }
}

describe("serialization", () => {
  describe("checkpoint", () => {
    it("serializes and deserializes checkpoint", () => {
      const checkpoint: Checkpoint = {
        id: createId(),
        jobId: createId(),
        runId: createId(),
        status: "proceeding",
        stepNumber: 1,
        messages: [],
        expert: {
          key: "test-expert",
          name: "Test Expert",
          version: "1.0.0",
        },
        usage: createEmptyUsage(),
      }
      const serialized = serializeCheckpoint(checkpoint)
      const deserialized = deserializeCheckpoint(serialized)
      expect(deserialized.id).toBe(checkpoint.id)
      expect(deserialized.status).toBe(checkpoint.status)
    })
  })

  describe("job", () => {
    it("serializes and deserializes job", () => {
      const job: Job = {
        id: createId(),
        status: "running",
        coordinatorExpertKey: "test-expert",
        totalSteps: 5,
        usage: createEmptyUsage(),
        startedAt: Date.now(),
      }
      const serialized = serializeJob(job)
      const deserialized = deserializeJob(serialized)
      expect(deserialized.id).toBe(job.id)
      expect(deserialized.status).toBe(job.status)
      expect(deserialized.totalSteps).toBe(job.totalSteps)
    })
  })

  describe("runSetting", () => {
    it("serializes and deserializes run setting", () => {
      const setting: RunSetting = {
        jobId: createId(),
        runId: createId(),
        model: "claude-sonnet-4-20250514",
        providerConfig: { providerName: "anthropic", apiKey: "test-key" },
        expertKey: "test-expert",
        input: { text: "hello" },
        experts: {},
        reasoningBudget: "low",
        maxSteps: 100,
        maxRetries: 3,
        timeout: 30000,
        startedAt: Date.now(),
        updatedAt: Date.now(),
        perstackApiBaseUrl: "https://api.perstack.dev",
        env: {},
      }
      const serialized = serializeRunSetting(setting)
      const deserialized = deserializeRunSetting(serialized)
      expect(deserialized.runId).toBe(setting.runId)
      expect(deserialized.model).toBe(setting.model)
    })
  })

  describe("event", () => {
    it("serializes and deserializes event", () => {
      const event: RunEvent = {
        type: "startRun",
        id: createId(),
        expertKey: "test-expert",
        timestamp: Date.now(),
        jobId: createId(),
        runId: createId(),
        stepNumber: 1,
      } as RunEvent
      const serialized = serializeEvent(event)
      const deserialized = deserializeEvent(serialized)
      expect(deserialized.id).toBe(event.id)
      expect(deserialized.type).toBe(event.type)
    })
  })
})
