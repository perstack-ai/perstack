import type { Checkpoint, Job } from "@perstack/core"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createCheckpoint, createRunSetting } from "../test/run-params.js"
import { createEmptyUsage } from "./helpers/usage.js"
import { run } from "./run.js"

const mockExecute = vi.fn()
const mockBuildReturnFromDelegation = vi.fn()

// Mock SingleRunExecutor as a class
vi.mock("./orchestration/index.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("./orchestration/index.js")>()
  return {
    ...original,
    SingleRunExecutor: class MockSingleRunExecutor {
      execute = mockExecute
    },
    buildReturnFromDelegation: (...args: unknown[]) => mockBuildReturnFromDelegation(...args),
  }
})

describe("@perstack/runtime: run", () => {
  const setting = createRunSetting({ jobId: "test-job-id" })
  const checkpoint = createCheckpoint({ jobId: "test-job-id" })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  function setupMockExecutor(results: Array<{ checkpoint: Checkpoint; expertToRun?: unknown }>) {
    let callIndex = 0
    mockExecute.mockImplementation(async () => {
      const result = results[callIndex]
      callIndex++
      return result
    })
  }

  describe("terminal states", () => {
    it("returns checkpoint on completed status", async () => {
      const completedCheckpoint = createCheckpoint({ status: "completed" })
      setupMockExecutor([{ checkpoint: completedCheckpoint }])

      const result = await run({ setting, checkpoint })

      expect(result.status).toBe("completed")
    })

    it("returns checkpoint on stoppedByInteractiveTool status", async () => {
      const stoppedCheckpoint = createCheckpoint({ status: "stoppedByInteractiveTool" })
      setupMockExecutor([{ checkpoint: stoppedCheckpoint }])

      const result = await run({ setting, checkpoint })

      expect(result.status).toBe("stoppedByInteractiveTool")
    })

    it("returns checkpoint on stoppedByExceededMaxSteps status", async () => {
      const stoppedCheckpoint = createCheckpoint({ status: "stoppedByExceededMaxSteps" })
      setupMockExecutor([{ checkpoint: stoppedCheckpoint }])

      const result = await run({ setting, checkpoint })

      expect(result.status).toBe("stoppedByExceededMaxSteps")
    })

    it("returns checkpoint on stoppedByError status", async () => {
      const stoppedCheckpoint = createCheckpoint({ status: "stoppedByError" })
      setupMockExecutor([{ checkpoint: stoppedCheckpoint }])

      const result = await run({ setting, checkpoint })

      expect(result.status).toBe("stoppedByError")
    })

    it("throws error on unknown status", async () => {
      // Manually create checkpoint with invalid status to bypass schema validation
      const unknownCheckpoint = {
        ...createCheckpoint({ status: "completed" }),
        status: "unknownStatus" as Checkpoint["status"],
      }
      setupMockExecutor([{ checkpoint: unknownCheckpoint }])

      await expect(run({ setting, checkpoint })).rejects.toThrow("Run stopped by unknown reason")
    })
  })

  describe("job management", () => {
    it("creates new job when retrieveJob returns undefined", async () => {
      const completedCheckpoint = createCheckpoint({ status: "completed" })
      setupMockExecutor([{ checkpoint: completedCheckpoint }])

      const storeJob = vi.fn()
      const retrieveJob = vi.fn().mockReturnValue(undefined)

      await run({ setting, checkpoint }, { storeJob, retrieveJob })

      expect(retrieveJob).toHaveBeenCalledWith("test-job-id")
      expect(storeJob).toHaveBeenCalled()
      const storedJob = storeJob.mock.calls[0][0] as Job
      expect(storedJob.id).toBe("test-job-id")
      expect(storedJob.status).toBe("running")
    })

    it("uses existing job from retrieveJob", async () => {
      const completedCheckpoint = createCheckpoint({ status: "completed" })
      setupMockExecutor([{ checkpoint: completedCheckpoint }])

      const existingJob: Job = {
        id: "test-job-id",
        coordinatorExpertKey: "test-expert",
        status: "running",
        totalSteps: 5,
        startedAt: Date.now(),
        usage: {
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
          reasoningTokens: 0,
          cachedInputTokens: 0,
        },
      }
      const storeJob = vi.fn()
      const retrieveJob = vi.fn().mockReturnValue(existingJob)

      await run({ setting, checkpoint }, { storeJob, retrieveJob })

      expect(retrieveJob).toHaveBeenCalledWith("test-job-id")
    })

    it("resets job status to running if not running", async () => {
      const completedCheckpoint = createCheckpoint({ status: "completed" })
      setupMockExecutor([{ checkpoint: completedCheckpoint }])

      const pausedJob: Job = {
        id: "test-job-id",
        coordinatorExpertKey: "test-expert",
        status: "stoppedByInteractiveTool",
        totalSteps: 5,
        startedAt: Date.now(),
        usage: {
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
          reasoningTokens: 0,
          cachedInputTokens: 0,
        },
      }
      const storeJob = vi.fn()
      const retrieveJob = vi.fn().mockReturnValue(pausedJob)

      await run({ setting, checkpoint }, { storeJob, retrieveJob })

      const firstStoreCall = storeJob.mock.calls[0][0] as Job
      expect(firstStoreCall.status).toBe("running")
    })

    it("updates job status to completed on successful completion", async () => {
      const completedCheckpoint = createCheckpoint({ status: "completed", stepNumber: 3 })
      setupMockExecutor([{ checkpoint: completedCheckpoint }])

      const storeJob = vi.fn()

      await run({ setting, checkpoint }, { storeJob })

      const lastCall = storeJob.mock.calls[storeJob.mock.calls.length - 1][0] as Job
      expect(lastCall.status).toBe("completed")
      expect(lastCall.totalSteps).toBe(3)
      expect(lastCall.finishedAt).toBeDefined()
    })

    it("updates job status to stoppedByMaxSteps on exceeded max steps", async () => {
      const stoppedCheckpoint = createCheckpoint({ status: "stoppedByExceededMaxSteps" })
      setupMockExecutor([{ checkpoint: stoppedCheckpoint }])

      const storeJob = vi.fn()

      await run({ setting, checkpoint }, { storeJob })

      const lastCall = storeJob.mock.calls[storeJob.mock.calls.length - 1][0] as Job
      expect(lastCall.status).toBe("stoppedByMaxSteps")
      expect(lastCall.finishedAt).toBeDefined()
    })

    it("updates job status to stoppedByError on error", async () => {
      const stoppedCheckpoint = createCheckpoint({ status: "stoppedByError" })
      setupMockExecutor([{ checkpoint: stoppedCheckpoint }])

      const storeJob = vi.fn()

      await run({ setting, checkpoint }, { storeJob })

      const lastCall = storeJob.mock.calls[storeJob.mock.calls.length - 1][0] as Job
      expect(lastCall.status).toBe("stoppedByError")
    })
  })

  describe("returnOnDelegationComplete option", () => {
    it("returns immediately when returnOnDelegationComplete is true", async () => {
      const completedCheckpoint = createCheckpoint({
        status: "completed",
        delegatedBy: {
          checkpointId: "parent-checkpoint-id",
          expert: { key: "parent-expert", name: "Parent Expert", version: "1.0.0" },
          toolCallId: "tool-call-id",
          toolName: "delegate_parent",
          runId: "parent-run-id",
        },
      })
      setupMockExecutor([{ checkpoint: completedCheckpoint }])

      const result = await run({ setting, checkpoint }, { returnOnDelegationComplete: true })

      expect(result.status).toBe("completed")
      expect(result.delegatedBy).toBeDefined()
    })
  })

  describe("delegation return handling", () => {
    it("continues loop when completed with delegatedBy", async () => {
      const delegatedCheckpoint = createCheckpoint({
        status: "completed",
        delegatedBy: {
          checkpointId: "parent-checkpoint-id",
          expert: { key: "parent-expert", name: "Parent Expert", version: "1.0.0" },
          toolCallId: "tool-call-id",
          toolName: "delegate_parent",
          runId: "parent-run-id",
        },
      })
      const parentCheckpoint = createCheckpoint({
        id: "parent-checkpoint-id",
        status: "proceeding",
      })
      const continueCheckpoint = createCheckpoint({ status: "proceeding" })
      const finalCheckpoint = createCheckpoint({ status: "completed" })

      let callIndex = 0
      mockExecute.mockImplementation(async () => {
        const results = [{ checkpoint: delegatedCheckpoint }, { checkpoint: finalCheckpoint }]
        return results[callIndex++]
      })

      // Mock buildReturnFromDelegation to return new setting/checkpoint for loop continuation
      mockBuildReturnFromDelegation.mockReturnValue({
        setting,
        checkpoint: continueCheckpoint,
      })

      const retrieveCheckpoint = vi.fn().mockResolvedValue(parentCheckpoint)

      const result = await run({ setting, checkpoint }, { retrieveCheckpoint })

      expect(retrieveCheckpoint).toHaveBeenCalledWith("test-job-id", "parent-checkpoint-id")
      expect(mockBuildReturnFromDelegation).toHaveBeenCalled()
      expect(mockExecute).toHaveBeenCalledTimes(2)
      expect(result.status).toBe("completed")
    })
  })

  describe("delegation handling", () => {
    it("throws error when stoppedByDelegate with no delegations", async () => {
      const delegateCheckpoint = createCheckpoint({
        status: "stoppedByDelegate",
        delegateTo: [],
      })
      setupMockExecutor([{ checkpoint: delegateCheckpoint }])

      await expect(run({ setting, checkpoint })).rejects.toThrow(
        "No delegations found in checkpoint",
      )
    })

    it("throws error when stoppedByDelegate with undefined delegateTo", async () => {
      const delegateCheckpoint = createCheckpoint({
        status: "stoppedByDelegate",
        delegateTo: undefined,
      })
      setupMockExecutor([{ checkpoint: delegateCheckpoint }])

      await expect(run({ setting, checkpoint })).rejects.toThrow(
        "No delegations found in checkpoint",
      )
    })
  })

  describe("custom createJob", () => {
    it("uses custom createJob function", async () => {
      const completedCheckpoint = createCheckpoint({ status: "completed" })
      setupMockExecutor([{ checkpoint: completedCheckpoint }])

      const customJob: Job = {
        id: "custom-job-id",
        coordinatorExpertKey: "custom-expert",
        status: "running",
        totalSteps: 0,
        startedAt: Date.now(),
        maxSteps: 100,
        usage: createEmptyUsage(),
      }
      const createJob = vi.fn().mockReturnValue(customJob)
      const storeJob = vi.fn()

      await run({ setting, checkpoint }, { createJob, storeJob })

      expect(createJob).toHaveBeenCalledWith("test-job-id", "test-expert", 10)
    })
  })
})
