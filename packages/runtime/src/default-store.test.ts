import fs from "node:fs/promises"
import path from "node:path"
import { createId } from "@paralleldrive/cuid2"
import type { Checkpoint, RunEvent } from "@perstack/core"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  defaultRetrieveCheckpoint,
  defaultStoreCheckpoint,
  defaultStoreEvent,
} from "./default-store.js"
import { createEmptyUsage } from "./usage.js"

function createTestCheckpoint(overrides: Partial<Checkpoint> = {}): Checkpoint {
  return {
    id: createId(),
    jobId: overrides.jobId ?? createId(),
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
    contextWindow: 100,
    contextWindowUsage: 0,
    ...overrides,
  }
}

function createTestEvent(overrides: Partial<RunEvent> = {}): RunEvent {
  return {
    type: "startRun",
    id: createId(),
    expertKey: "test-expert",
    timestamp: Date.now(),
    jobId: createId(),
    runId: createId(),
    stepNumber: 1,
    ...overrides,
  } as RunEvent
}

describe("@perstack/runtime: default-store", () => {
  const testJobId = `test-job-${Date.now()}`
  const testRunId = `test-run-${Date.now()}`
  const testJobDir = `${process.cwd()}/perstack/jobs/${testJobId}`
  const testCheckpointDir = `${testJobDir}/checkpoints`
  const testRunDir = `${testJobDir}/runs/${testRunId}`

  beforeEach(async () => {
    await fs.rm(testJobDir, { recursive: true, force: true })
  })

  afterEach(async () => {
    await fs.rm(testJobDir, { recursive: true, force: true })
  })

  describe("defaultStoreCheckpoint", () => {
    it("stores checkpoint to filesystem", async () => {
      const checkpoint = createTestCheckpoint({ jobId: testJobId, runId: testRunId })
      await defaultStoreCheckpoint(checkpoint)
      const expectedPath = path.join(testCheckpointDir, `${checkpoint.id}.json`)
      const stored = JSON.parse(await fs.readFile(expectedPath, "utf-8"))
      expect(stored.id).toBe(checkpoint.id)
      expect(stored.runId).toBe(checkpoint.runId)
    })

    it("creates checkpoints directory if not exists", async () => {
      const checkpoint = createTestCheckpoint({ jobId: testJobId, runId: testRunId })
      await defaultStoreCheckpoint(checkpoint)
      const dirExists = await fs
        .stat(testCheckpointDir)
        .then(() => true)
        .catch(() => false)
      expect(dirExists).toBe(true)
    })
  })

  describe("defaultRetrieveCheckpoint", () => {
    it("retrieves stored checkpoint by id", async () => {
      const checkpoint = createTestCheckpoint({ jobId: testJobId, runId: testRunId })
      await defaultStoreCheckpoint(checkpoint)
      const retrieved = await defaultRetrieveCheckpoint(testJobId, checkpoint.id)
      expect(retrieved.id).toBe(checkpoint.id)
      expect(retrieved.runId).toBe(checkpoint.runId)
    })

    it("throws error when checkpoint not found", async () => {
      await expect(defaultRetrieveCheckpoint(testJobId, "nonexistent-id")).rejects.toThrow(
        "checkpoint not found",
      )
    })
  })

  describe("defaultStoreEvent", () => {
    it("stores event to filesystem", async () => {
      const event = createTestEvent({ jobId: testJobId, runId: testRunId })
      await defaultStoreEvent(event)
      const expectedPath = path.join(
        testRunDir,
        `event-${event.timestamp}-${event.stepNumber}-${event.type}.json`,
      )
      const stored = JSON.parse(await fs.readFile(expectedPath, "utf-8"))
      expect(stored.id).toBe(event.id)
      expect(stored.type).toBe(event.type)
    })

    it("creates run directory if not exists", async () => {
      const event = createTestEvent({ jobId: testJobId, runId: testRunId })
      await defaultStoreEvent(event)
      const dirExists = await fs
        .stat(testRunDir)
        .then(() => true)
        .catch(() => false)
      expect(dirExists).toBe(true)
    })
  })
})
