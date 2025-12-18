import type { Job } from "@perstack/core"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createCheckpoint, createRunSetting } from "../test/run-params.js"
import { run } from "./run.js"

// Create mock execute function that can be configured per test
const mockExecute = vi.fn()

// Track constructor calls
const constructorCalls: unknown[] = []

// Mock the SingleRunExecutor class
vi.mock("./orchestration/index.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("./orchestration/index.js")>()
  return {
    ...original,
    SingleRunExecutor: class MockSingleRunExecutor {
      constructor(public options: unknown) {
        constructorCalls.push(options)
      }
      execute = mockExecute
    },
  }
})

describe("@perstack/runtime: run", () => {
  beforeEach(() => {
    mockExecute.mockReset()
    constructorCalls.length = 0
  })

  it("creates job if not found", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint({ jobId: setting.jobId, runId: setting.runId })
    const experts = setting.experts

    let storedJob: Job | undefined
    const storeJob = vi.fn((job: Job) => {
      storedJob = job
    })

    mockExecute.mockResolvedValue({
      checkpoint: { ...checkpoint, status: "completed" },
      expertToRun: experts,
    })

    await run(
      { setting, checkpoint, experts },
      {
        storeJob,
        retrieveJob: () => undefined,
      },
    )

    expect(storeJob).toHaveBeenCalled()
    expect(storedJob?.id).toBe(setting.jobId)
    expect(storedJob?.status).toBe("completed")
  })

  it("uses existing job if found", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint({ jobId: setting.jobId, runId: setting.runId })
    const experts = setting.experts

    const existingJob: Job = {
      id: setting.jobId,
      coordinatorExpertKey: setting.expertKey,
      status: "running",
      totalSteps: 5,
      startedAt: Date.now(),
      usage: {
        inputTokens: 100,
        outputTokens: 50,
        reasoningTokens: 0,
        totalTokens: 150,
        cachedInputTokens: 0,
      },
    }

    const storeJob = vi.fn()
    const retrieveJob = vi.fn().mockReturnValue(existingJob)

    mockExecute.mockResolvedValue({
      checkpoint: { ...checkpoint, status: "completed" },
      expertToRun: experts,
    })

    await run(
      { setting, checkpoint, experts },
      {
        storeJob,
        retrieveJob,
      },
    )

    expect(retrieveJob).toHaveBeenCalledWith(setting.jobId)
    expect(storeJob).toHaveBeenCalled()
  })

  it("returns checkpoint on completed status", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint({ jobId: setting.jobId, runId: setting.runId })
    const experts = setting.experts

    mockExecute.mockResolvedValue({
      checkpoint: { ...checkpoint, status: "completed" },
      expertToRun: experts,
    })

    const result = await run({ setting, checkpoint, experts })

    expect(result.status).toBe("completed")
  })

  it("returns checkpoint on stoppedByInteractiveTool status", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint({ jobId: setting.jobId, runId: setting.runId })
    const experts = setting.experts

    mockExecute.mockResolvedValue({
      checkpoint: { ...checkpoint, status: "stoppedByInteractiveTool" },
      expertToRun: experts,
    })

    const result = await run({ setting, checkpoint, experts })

    expect(result.status).toBe("stoppedByInteractiveTool")
  })

  it("returns checkpoint on stoppedByExceededMaxSteps status", async () => {
    const setting = createRunSetting({ maxSteps: 5 })
    const checkpoint = createCheckpoint({ jobId: setting.jobId, runId: setting.runId })
    const experts = setting.experts

    mockExecute.mockResolvedValue({
      checkpoint: { ...checkpoint, status: "stoppedByExceededMaxSteps" },
      expertToRun: experts,
    })

    const result = await run({ setting, checkpoint, experts })

    expect(result.status).toBe("stoppedByExceededMaxSteps")
  })

  it("returns checkpoint on stoppedByError status", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint({ jobId: setting.jobId, runId: setting.runId })
    const experts = setting.experts

    mockExecute.mockResolvedValue({
      checkpoint: { ...checkpoint, status: "stoppedByError" },
      expertToRun: experts,
    })

    const result = await run({ setting, checkpoint, experts })

    expect(result.status).toBe("stoppedByError")
  })

  it("updates job totalSteps from checkpoint", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint({ jobId: setting.jobId, runId: setting.runId })
    const experts = setting.experts

    let storedJob: Job | undefined
    const storeJob = vi.fn((job: Job) => {
      storedJob = job
    })

    mockExecute.mockResolvedValue({
      checkpoint: { ...checkpoint, status: "completed", stepNumber: 10 },
      expertToRun: experts,
    })

    await run(
      { setting, checkpoint, experts },
      {
        storeJob,
      },
    )

    expect(storedJob?.totalSteps).toBe(10)
  })

  it("resets non-running job status to running", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint({ jobId: setting.jobId, runId: setting.runId })
    const experts = setting.experts

    const existingJob: Job = {
      id: setting.jobId,
      coordinatorExpertKey: setting.expertKey,
      status: "stoppedByError",
      totalSteps: 5,
      startedAt: Date.now(),
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        reasoningTokens: 0,
        totalTokens: 0,
        cachedInputTokens: 0,
      },
    }

    const storedJobs: Job[] = []
    const storeJob = vi.fn((job: Job) => {
      storedJobs.push(job)
    })

    mockExecute.mockResolvedValue({
      checkpoint: { ...checkpoint, status: "completed" },
      expertToRun: experts,
    })

    await run(
      { setting, checkpoint, experts },
      {
        storeJob,
        retrieveJob: () => existingJob,
      },
    )

    // First call resets to running, last call sets to completed
    expect(storedJobs[0].status).toBe("running")
  })

  it("passes options to SingleRunExecutor", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint({ jobId: setting.jobId, runId: setting.runId })
    const experts = setting.experts

    const shouldContinueRun = vi.fn().mockResolvedValue(true)
    const storeCheckpoint = vi.fn()
    const storeEvent = vi.fn()
    const eventListener = vi.fn()

    mockExecute.mockResolvedValue({
      checkpoint: { ...checkpoint, status: "completed" },
      expertToRun: experts,
    })

    await run(
      { setting, checkpoint, experts },
      {
        shouldContinueRun,
        storeCheckpoint,
        storeEvent,
        eventListener,
      },
    )

    expect(constructorCalls).toHaveLength(1)
    expect(constructorCalls[0]).toMatchObject({
      shouldContinueRun,
      storeCheckpoint,
      storeEvent,
      eventListener,
    })
  })
})
