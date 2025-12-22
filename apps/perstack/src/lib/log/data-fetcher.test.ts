import type { Checkpoint, Job, RunEvent, RunSetting } from "@perstack/core"
import { describe, expect, it, vi } from "vitest"
import { createLogDataFetcher } from "./data-fetcher.js"

const mockJob: Job = {
  id: "job-1",
  status: "completed",
  coordinatorExpertKey: "test-expert@1.0.0",
  totalSteps: 5,
  usage: {
    inputTokens: 1000,
    outputTokens: 500,
    totalTokens: 1500,
    cachedInputTokens: 0,
    reasoningTokens: 0,
  },
  startedAt: 1700000000000,
  finishedAt: 1700001000000,
}

const mockCheckpoint: Checkpoint = {
  id: "cp-1",
  jobId: "job-1",
  runId: "run-1",
  status: "completed",
  stepNumber: 5,
  messages: [],
  expert: { key: "test-expert@1.0.0", name: "test-expert", version: "1.0.0" },
  usage: {
    inputTokens: 1000,
    outputTokens: 500,
    totalTokens: 1500,
    cachedInputTokens: 0,
    reasoningTokens: 0,
  },
}

const mockEvents: RunEvent[] = [
  {
    id: "e1",
    type: "startRun",
    timestamp: 1700000000000,
    jobId: "job-1",
    runId: "run-1",
    stepNumber: 1,
    expertKey: "test-expert@1.0.0",
    initialCheckpoint: mockCheckpoint,
    inputMessages: [],
  },
  {
    id: "e2",
    type: "completeRun",
    timestamp: 1700001000000,
    jobId: "job-1",
    runId: "run-1",
    stepNumber: 5,
    expertKey: "test-expert@1.0.0",
    checkpoint: mockCheckpoint,
    step: { stepNumber: 5, newMessages: [], usage: mockCheckpoint.usage, startedAt: 1700000900000 },
    text: "Done",
    usage: mockCheckpoint.usage,
  },
]

const mockRunSetting: RunSetting = {
  model: "claude-sonnet-4-5",
  providerConfig: { providerName: "anthropic", apiKey: "test-key" },
  jobId: "job-1",
  runId: "run-1",
  expertKey: "test-expert@1.0.0",
  input: { text: "test query" },
  experts: {},
  reasoningBudget: "low",
  maxSteps: 100,
  maxRetries: 5,
  timeout: 60000,
  startedAt: 1700000000000,
  updatedAt: 1700001000000,
  perstackApiBaseUrl: "https://api.perstack.ai",
  env: {},
}

describe("createLogDataFetcher", () => {
  const mockStorage = {
    getAllJobs: vi.fn(),
    retrieveJob: vi.fn(),
    getCheckpointsByJobId: vi.fn(),
    retrieveCheckpoint: vi.fn(),
    getEventContents: vi.fn(),
    getAllRuns: vi.fn(),
  }

  it("returns undefined for non-existent job", async () => {
    mockStorage.retrieveJob.mockResolvedValue(undefined)
    const fetcher = createLogDataFetcher(mockStorage)
    const result = await fetcher.getJob("nonexistent")
    expect(result).toBeUndefined()
  })

  it("retrieves job by id", async () => {
    mockStorage.retrieveJob.mockResolvedValue(mockJob)
    const fetcher = createLogDataFetcher(mockStorage)
    const result = await fetcher.getJob("job-1")
    expect(result).toEqual(mockJob)
  })

  it("retrieves latest job", async () => {
    mockStorage.getAllJobs.mockResolvedValue([mockJob])
    const fetcher = createLogDataFetcher(mockStorage)
    const result = await fetcher.getLatestJob()
    expect(result).toEqual(mockJob)
  })

  it("returns undefined when no jobs exist", async () => {
    mockStorage.getAllJobs.mockResolvedValue([])
    const fetcher = createLogDataFetcher(mockStorage)
    const result = await fetcher.getLatestJob()
    expect(result).toBeUndefined()
  })

  it("retrieves checkpoints for job", async () => {
    mockStorage.getCheckpointsByJobId.mockResolvedValue([mockCheckpoint])
    const fetcher = createLogDataFetcher(mockStorage)
    const result = await fetcher.getCheckpoints("job-1")
    expect(result).toEqual([mockCheckpoint])
  })

  it("retrieves checkpoint by id", async () => {
    mockStorage.retrieveCheckpoint.mockResolvedValue(mockCheckpoint)
    const fetcher = createLogDataFetcher(mockStorage)
    const result = await fetcher.getCheckpoint("job-1", "cp-1")
    expect(result).toEqual(mockCheckpoint)
  })

  it("retrieves events for run", async () => {
    mockStorage.getEventContents.mockResolvedValue(mockEvents)
    const fetcher = createLogDataFetcher(mockStorage)
    const result = await fetcher.getEvents("job-1", "run-1")
    expect(result).toEqual(mockEvents)
  })

  it("retrieves all events for job", async () => {
    mockStorage.getAllRuns.mockResolvedValue([mockRunSetting])
    mockStorage.getEventContents.mockResolvedValue(mockEvents)
    const fetcher = createLogDataFetcher(mockStorage)
    const result = await fetcher.getAllEventsForJob("job-1")
    expect(result).toEqual(mockEvents)
  })

  it("retrieves runs for job", async () => {
    mockStorage.getAllRuns.mockResolvedValue([mockRunSetting])
    const fetcher = createLogDataFetcher(mockStorage)
    const result = await fetcher.getRuns("job-1")
    expect(result).toEqual([mockRunSetting])
  })
})
