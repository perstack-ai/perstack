import fs from "node:fs/promises"
import { createId } from "@paralleldrive/cuid2"
import type { Checkpoint, Job, RunEvent, RunSetting, Usage } from "@perstack/core"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { FileSystemStorage } from "./filesystem-storage.js"

function createEmptyUsage(): Usage {
  return {
    inputTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    totalTokens: 0,
    cachedInputTokens: 0,
  }
}

function createTestCheckpoint(overrides: Partial<Checkpoint> = {}): Checkpoint {
  return {
    id: createId(),
    jobId: overrides.jobId ?? createId(),
    runId: overrides.runId ?? createId(),
    status: "proceeding",
    stepNumber: overrides.stepNumber ?? 1,
    messages: [],
    expert: {
      key: "test-expert",
      name: "Test Expert",
      version: "1.0.0",
    },
    usage: createEmptyUsage(),
    contextWindow: 100,
    contextWindowUsage: 0,
    ...overrides,
  }
}

function createTestJob(overrides: Partial<Job> = {}): Job {
  return {
    id: overrides.id ?? createId(),
    status: "running",
    coordinatorExpertKey: "test-expert",
    totalSteps: 0,
    usage: createEmptyUsage(),
    startedAt: overrides.startedAt ?? Date.now(),
    ...overrides,
  }
}

function createTestRunSetting(overrides: Partial<RunSetting> = {}): RunSetting {
  return {
    jobId: overrides.jobId ?? createId(),
    runId: overrides.runId ?? createId(),
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
    updatedAt: overrides.updatedAt ?? Date.now(),
    perstackApiBaseUrl: "https://api.perstack.dev",
    env: {},
    ...overrides,
  }
}

function createTestEvent(overrides: Partial<RunEvent> = {}): RunEvent {
  return {
    type: "startRun",
    id: createId(),
    expertKey: "test-expert",
    timestamp: overrides.timestamp ?? Date.now(),
    jobId: overrides.jobId ?? createId(),
    runId: overrides.runId ?? createId(),
    stepNumber: overrides.stepNumber ?? 1,
    ...overrides,
  } as RunEvent
}

describe("FileSystemStorage", () => {
  const testBasePath = `${process.cwd()}/test-perstack-${Date.now()}`
  let storage: FileSystemStorage

  beforeEach(async () => {
    await fs.rm(testBasePath, { recursive: true, force: true })
    storage = new FileSystemStorage({ basePath: testBasePath })
  })

  afterEach(async () => {
    await fs.rm(testBasePath, { recursive: true, force: true })
  })

  describe("storeCheckpoint and retrieveCheckpoint", () => {
    it("stores and retrieves a checkpoint", async () => {
      const checkpoint = createTestCheckpoint()
      await storage.storeCheckpoint(checkpoint)
      const retrieved = await storage.retrieveCheckpoint(checkpoint.jobId, checkpoint.id)
      expect(retrieved.id).toBe(checkpoint.id)
      expect(retrieved.jobId).toBe(checkpoint.jobId)
    })

    it("throws error when checkpoint not found", async () => {
      await expect(storage.retrieveCheckpoint("job-123", "nonexistent")).rejects.toThrow(
        "checkpoint not found",
      )
    })
  })

  describe("getCheckpointsByJobId", () => {
    it("returns empty array when no checkpoints exist", async () => {
      const result = await storage.getCheckpointsByJobId("nonexistent-job")
      expect(result).toEqual([])
    })

    it("returns checkpoints sorted by step number", async () => {
      const jobId = createId()
      const cp1 = createTestCheckpoint({ jobId, stepNumber: 3 })
      const cp2 = createTestCheckpoint({ jobId, stepNumber: 1 })
      const cp3 = createTestCheckpoint({ jobId, stepNumber: 2 })

      await storage.storeCheckpoint(cp1)
      await storage.storeCheckpoint(cp2)
      await storage.storeCheckpoint(cp3)

      const result = await storage.getCheckpointsByJobId(jobId)
      expect(result).toHaveLength(3)
      expect(result[0].stepNumber).toBe(1)
      expect(result[1].stepNumber).toBe(2)
      expect(result[2].stepNumber).toBe(3)
    })
  })

  describe("storeJob and retrieveJob", () => {
    it("stores and retrieves a job", async () => {
      const job = createTestJob()
      await storage.storeJob(job)
      const retrieved = await storage.retrieveJob(job.id)
      expect(retrieved?.id).toBe(job.id)
      expect(retrieved?.status).toBe(job.status)
    })

    it("returns undefined when job not found", async () => {
      const result = await storage.retrieveJob("nonexistent")
      expect(result).toBeUndefined()
    })
  })

  describe("getAllJobs", () => {
    it("returns empty array when no jobs exist", async () => {
      const result = await storage.getAllJobs()
      expect(result).toEqual([])
    })

    it("returns jobs sorted by start time (newest first)", async () => {
      const job1 = createTestJob({ startedAt: 1000 })
      const job2 = createTestJob({ startedAt: 3000 })
      const job3 = createTestJob({ startedAt: 2000 })

      await storage.storeJob(job1)
      await storage.storeJob(job2)
      await storage.storeJob(job3)

      const result = await storage.getAllJobs()
      expect(result).toHaveLength(3)
      expect(result[0].startedAt).toBe(3000)
      expect(result[1].startedAt).toBe(2000)
      expect(result[2].startedAt).toBe(1000)
    })
  })

  describe("storeRunSetting and getAllRuns", () => {
    it("stores and retrieves run settings", async () => {
      const setting = createTestRunSetting()
      await storage.storeRunSetting(setting)
      const runs = await storage.getAllRuns()
      expect(runs).toHaveLength(1)
      expect(runs[0].runId).toBe(setting.runId)
    })

    it("updates updatedAt when run already exists", async () => {
      const setting = createTestRunSetting({ updatedAt: 1000 })
      await storage.storeRunSetting(setting)
      const beforeUpdate = Date.now()
      await storage.storeRunSetting(setting)
      const afterUpdate = Date.now()
      const runs = await storage.getAllRuns()
      expect(runs[0].updatedAt).toBeGreaterThanOrEqual(beforeUpdate)
      expect(runs[0].updatedAt).toBeLessThanOrEqual(afterUpdate)
    })

    it("returns runs sorted by updated time (newest first)", async () => {
      const run1 = createTestRunSetting({ updatedAt: 1000 })
      const run2 = createTestRunSetting({ updatedAt: 3000 })
      const run3 = createTestRunSetting({ updatedAt: 2000 })

      await storage.storeRunSetting(run1)
      await storage.storeRunSetting(run2)
      await storage.storeRunSetting(run3)

      const result = await storage.getAllRuns()
      expect(result).toHaveLength(3)
      expect(result[0].updatedAt).toBe(3000)
      expect(result[1].updatedAt).toBe(2000)
      expect(result[2].updatedAt).toBe(1000)
    })
  })

  describe("storeEvent and getEventsByRun", () => {
    it("stores and retrieves event metadata", async () => {
      const jobId = createId()
      const runId = createId()
      const event = createTestEvent({ jobId, runId, timestamp: 12345, stepNumber: 1 })
      await storage.storeEvent(event)
      const events = await storage.getEventsByRun(jobId, runId)
      expect(events).toHaveLength(1)
      expect(events[0].timestamp).toBe(12345)
      expect(events[0].stepNumber).toBe(1)
      expect(events[0].type).toBe("startRun")
    })

    it("returns events sorted by step number", async () => {
      const jobId = createId()
      const runId = createId()
      const event1 = createTestEvent({ jobId, runId, stepNumber: 3 })
      const event2 = createTestEvent({ jobId, runId, stepNumber: 1 })
      const event3 = createTestEvent({ jobId, runId, stepNumber: 2 })

      await storage.storeEvent(event1)
      await storage.storeEvent(event2)
      await storage.storeEvent(event3)

      const events = await storage.getEventsByRun(jobId, runId)
      expect(events).toHaveLength(3)
      expect(events[0].stepNumber).toBe(1)
      expect(events[1].stepNumber).toBe(2)
      expect(events[2].stepNumber).toBe(3)
    })
  })

  describe("getEventContents", () => {
    it("returns full event contents", async () => {
      const jobId = createId()
      const runId = createId()
      const event = createTestEvent({ jobId, runId })
      await storage.storeEvent(event)
      const contents = await storage.getEventContents(jobId, runId)
      expect(contents).toHaveLength(1)
      expect(contents[0].id).toBe(event.id)
    })

    it("filters by maxStep", async () => {
      const jobId = createId()
      const runId = createId()
      const event1 = createTestEvent({ jobId, runId, stepNumber: 1, timestamp: 1000 })
      const event2 = createTestEvent({ jobId, runId, stepNumber: 2, timestamp: 2000 })
      const event3 = createTestEvent({ jobId, runId, stepNumber: 3, timestamp: 3000 })

      await storage.storeEvent(event1)
      await storage.storeEvent(event2)
      await storage.storeEvent(event3)

      const contents = await storage.getEventContents(jobId, runId, 2)
      expect(contents).toHaveLength(2)
    })

    it("returns events sorted by timestamp", async () => {
      const jobId = createId()
      const runId = createId()
      const event1 = createTestEvent({ jobId, runId, timestamp: 3000, stepNumber: 1 })
      const event2 = createTestEvent({ jobId, runId, timestamp: 1000, stepNumber: 1 })
      const event3 = createTestEvent({ jobId, runId, timestamp: 2000, stepNumber: 1 })

      await storage.storeEvent(event1)
      await storage.storeEvent(event2)
      await storage.storeEvent(event3)

      const contents = await storage.getEventContents(jobId, runId)
      expect(contents).toHaveLength(3)
      expect(contents[0].timestamp).toBe(1000)
      expect(contents[1].timestamp).toBe(2000)
      expect(contents[2].timestamp).toBe(3000)
    })
  })

  describe("default basePath", () => {
    it("uses cwd/perstack by default", () => {
      const defaultStorage = new FileSystemStorage()
      expect(defaultStorage).toBeInstanceOf(FileSystemStorage)
    })
  })
})
