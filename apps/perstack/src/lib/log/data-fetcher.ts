import type { Checkpoint, Job, RunEvent, RunSetting, Storage } from "@perstack/core"

export interface LogDataFetcher {
  getJob(jobId: string): Promise<Job | undefined>
  getLatestJob(): Promise<Job | undefined>
  getRuns(jobId: string): Promise<RunSetting[]>
  getCheckpoints(jobId: string): Promise<Checkpoint[]>
  getCheckpoint(jobId: string, checkpointId: string): Promise<Checkpoint>
  getEvents(jobId: string, runId: string): Promise<RunEvent[]>
  getAllEventsForJob(jobId: string): Promise<RunEvent[]>
}

export interface StorageAdapter {
  getAllJobs(): Promise<Job[]>
  retrieveJob(jobId: string): Promise<Job | undefined>
  getCheckpointsByJobId(jobId: string): Promise<Checkpoint[]>
  retrieveCheckpoint(jobId: string, checkpointId: string): Promise<Checkpoint>
  getEventContents(jobId: string, runId: string, maxStep?: number): Promise<RunEvent[]>
  getAllRuns(): Promise<RunSetting[]>
}

export function createLogDataFetcher(storage: StorageAdapter): LogDataFetcher {
  return {
    async getJob(jobId: string): Promise<Job | undefined> {
      return storage.retrieveJob(jobId)
    },

    async getLatestJob(): Promise<Job | undefined> {
      const jobs = await storage.getAllJobs()
      return jobs[0]
    },

    async getRuns(jobId: string): Promise<RunSetting[]> {
      const runs = await storage.getAllRuns()
      return runs.filter((r) => r.jobId === jobId)
    },

    async getCheckpoints(jobId: string): Promise<Checkpoint[]> {
      return storage.getCheckpointsByJobId(jobId)
    },

    async getCheckpoint(jobId: string, checkpointId: string): Promise<Checkpoint> {
      return storage.retrieveCheckpoint(jobId, checkpointId)
    },

    async getEvents(jobId: string, runId: string): Promise<RunEvent[]> {
      return storage.getEventContents(jobId, runId)
    },

    async getAllEventsForJob(jobId: string): Promise<RunEvent[]> {
      const runs = await storage.getAllRuns()
      const jobRuns = runs.filter((r) => r.jobId === jobId)
      const allEvents: RunEvent[] = []
      for (const run of jobRuns) {
        const events = await storage.getEventContents(jobId, run.runId)
        allEvents.push(...events)
      }
      return allEvents.sort((a, b) => a.timestamp - b.timestamp)
    },
  }
}

export function createStorageAdapter(storage: Storage): StorageAdapter {
  return {
    getAllJobs: () => storage.getAllJobs(),
    retrieveJob: (jobId) => storage.retrieveJob(jobId),
    getCheckpointsByJobId: (jobId) => storage.getCheckpointsByJobId(jobId),
    retrieveCheckpoint: (jobId, checkpointId) => storage.retrieveCheckpoint(jobId, checkpointId),
    getEventContents: (jobId, runId, maxStep) => storage.getEventContents(jobId, runId, maxStep),
    getAllRuns: () => storage.getAllRuns(),
  }
}
