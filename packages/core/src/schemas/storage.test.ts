import { describe, expect, it } from "vitest"
import type { Checkpoint } from "./checkpoint.js"
import type { Job } from "./job.js"
import type { RunEvent, RunSetting } from "./runtime.js"
import type { EventMeta, Storage } from "./storage.js"

describe("Storage interface", () => {
  it("can be implemented with all required methods", () => {
    const mockStorage: Storage = {
      storeCheckpoint: async (_checkpoint: Checkpoint): Promise<void> => {},
      retrieveCheckpoint: async (_jobId: string, _checkpointId: string): Promise<Checkpoint> => {
        return {} as Checkpoint
      },
      getCheckpointsByJobId: async (_jobId: string): Promise<Checkpoint[]> => [],
      storeEvent: async (_event: RunEvent): Promise<void> => {},
      getEventsByRun: async (_jobId: string, _runId: string): Promise<EventMeta[]> => [],
      getEventContents: async (
        _jobId: string,
        _runId: string,
        _maxStep?: number,
      ): Promise<RunEvent[]> => [],
      storeJob: async (_job: Job): Promise<void> => {},
      retrieveJob: async (_jobId: string): Promise<Job | undefined> => undefined,
      getAllJobs: async (): Promise<Job[]> => [],
      storeRunSetting: async (_setting: RunSetting): Promise<void> => {},
      getAllRuns: async (): Promise<RunSetting[]> => [],
    }
    expect(mockStorage).toBeDefined()
    expect(typeof mockStorage.storeCheckpoint).toBe("function")
    expect(typeof mockStorage.retrieveCheckpoint).toBe("function")
    expect(typeof mockStorage.getCheckpointsByJobId).toBe("function")
    expect(typeof mockStorage.storeEvent).toBe("function")
    expect(typeof mockStorage.getEventsByRun).toBe("function")
    expect(typeof mockStorage.getEventContents).toBe("function")
    expect(typeof mockStorage.storeJob).toBe("function")
    expect(typeof mockStorage.retrieveJob).toBe("function")
    expect(typeof mockStorage.getAllJobs).toBe("function")
    expect(typeof mockStorage.storeRunSetting).toBe("function")
    expect(typeof mockStorage.getAllRuns).toBe("function")
  })

  it("EventMeta type has correct structure", () => {
    const meta: EventMeta = {
      timestamp: Date.now(),
      stepNumber: 1,
      type: "startRun",
    }
    expect(meta.timestamp).toBeTypeOf("number")
    expect(meta.stepNumber).toBeTypeOf("number")
    expect(meta.type).toBeTypeOf("string")
  })
})
