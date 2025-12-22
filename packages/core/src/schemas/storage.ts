import type { Checkpoint } from "./checkpoint.js"
import type { Job } from "./job.js"
import type { RunEvent, RunSetting } from "./runtime.js"

/**
 * Metadata for an event, used for listing events without loading full content.
 */
export type EventMeta = {
  timestamp: number
  stepNumber: number
  type: string
}

/**
 * Abstract storage interface for persisting Perstack data.
 *
 * Implementations include:
 * - FileSystemStorage: Local filesystem storage (default)
 * - S3Storage: AWS S3 storage
 * - R2Storage: Cloudflare R2 storage
 */
export interface Storage {
  /**
   * Store a checkpoint.
   */
  storeCheckpoint(checkpoint: Checkpoint): Promise<void>

  /**
   * Retrieve a checkpoint by job ID and checkpoint ID.
   * @throws Error if checkpoint not found
   */
  retrieveCheckpoint(jobId: string, checkpointId: string): Promise<Checkpoint>

  /**
   * Get all checkpoints for a job, sorted by step number.
   */
  getCheckpointsByJobId(jobId: string): Promise<Checkpoint[]>

  /**
   * Store an event.
   */
  storeEvent(event: RunEvent): Promise<void>

  /**
   * Get event metadata for a run, sorted by step number.
   */
  getEventsByRun(jobId: string, runId: string): Promise<EventMeta[]>

  /**
   * Get full event contents for a run, optionally filtered by max step.
   */
  getEventContents(jobId: string, runId: string, maxStep?: number): Promise<RunEvent[]>

  /**
   * Store a job.
   */
  storeJob(job: Job): Promise<void>

  /**
   * Retrieve a job by ID.
   * @returns Job or undefined if not found
   */
  retrieveJob(jobId: string): Promise<Job | undefined>

  /**
   * Get all jobs, sorted by start time (newest first).
   */
  getAllJobs(): Promise<Job[]>

  /**
   * Store a run setting. Updates updatedAt if run already exists.
   */
  storeRunSetting(setting: RunSetting): Promise<void>

  /**
   * Get all run settings, sorted by updated time (newest first).
   */
  getAllRuns(): Promise<RunSetting[]>
}
