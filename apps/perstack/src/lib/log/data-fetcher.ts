import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
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
  getJobIds(): string[]
  getBasePath(): string
}

export function createLogDataFetcher(storage: StorageAdapter): LogDataFetcher {
  return {
    async getJob(jobId: string): Promise<Job | undefined> {
      // First try to get from storage
      const job = await storage.retrieveJob(jobId)
      if (job) return job
      // Fallback: construct minimal job from checkpoints
      const checkpoints = await storage.getCheckpointsByJobId(jobId)
      if (checkpoints.length === 0) return undefined
      const firstCheckpoint = checkpoints[0]
      const lastCheckpoint = checkpoints[checkpoints.length - 1]
      return {
        id: jobId,
        coordinatorExpertKey: firstCheckpoint.expert.key,
        totalSteps: lastCheckpoint.stepNumber,
        usage: lastCheckpoint.usage,
        startedAt: getJobDirMtime(storage.getBasePath(), jobId),
        finishedAt: Date.now(),
        status: lastCheckpoint.status === "completed" ? "completed" : "running",
      }
    },

    async getLatestJob(): Promise<Job | undefined> {
      // First try standard storage
      const jobs = await storage.getAllJobs()
      if (jobs.length > 0) return jobs[0]
      // Fallback: scan job directories
      const jobIds = storage.getJobIds()
      if (jobIds.length === 0) return undefined
      // Sort by directory modification time (newest first)
      const basePath = storage.getBasePath()
      const sortedJobIds = jobIds
        .map((id) => ({ id, mtime: getJobDirMtime(basePath, id) }))
        .sort((a, b) => b.mtime - a.mtime)
      const latestJobId = sortedJobIds[0].id
      return this.getJob(latestJobId)
    },

    async getRuns(jobId: string): Promise<RunSetting[]> {
      const runs = await storage.getAllRuns()
      const jobRuns = runs.filter((r) => r.jobId === jobId)
      if (jobRuns.length > 0) return jobRuns
      // Fallback: extract unique runIds from checkpoints and return minimal run info
      const checkpoints = await storage.getCheckpointsByJobId(jobId)
      const runIds = [...new Set(checkpoints.map((c) => c.runId))]
      // Return minimal objects with just jobId and runId for event retrieval
      return runIds.map((runId) => ({ jobId, runId }) as unknown as RunSetting)
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
      const runs = await this.getRuns(jobId)
      const allEvents: RunEvent[] = []
      for (const run of runs) {
        const events = await storage.getEventContents(jobId, run.runId)
        allEvents.push(...events)
      }
      return allEvents.sort((a, b) => a.timestamp - b.timestamp)
    },
  }
}

function getJobDirMtime(basePath: string, jobId: string): number {
  try {
    const jobDir = path.join(basePath, "jobs", jobId)
    const stats = statSync(jobDir)
    return stats.mtimeMs
  } catch {
    return Date.now()
  }
}

export function createStorageAdapter(storage: Storage, basePath: string): StorageAdapter {
  return {
    getAllJobs: () => storage.getAllJobs(),
    retrieveJob: (jobId) => storage.retrieveJob(jobId),
    getCheckpointsByJobId: (jobId) => storage.getCheckpointsByJobId(jobId),
    retrieveCheckpoint: (jobId, checkpointId) => storage.retrieveCheckpoint(jobId, checkpointId),
    getEventContents: (jobId, runId, maxStep) => storage.getEventContents(jobId, runId, maxStep),
    getAllRuns: () => storage.getAllRuns(),
    getJobIds: () => {
      const jobsDir = path.join(basePath, "jobs")
      if (!existsSync(jobsDir)) return []
      return readdirSync(jobsDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
    },
    getBasePath: () => basePath,
  }
}
