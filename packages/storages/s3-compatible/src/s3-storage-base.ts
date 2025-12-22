import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  type S3Client,
} from "@aws-sdk/client-s3"
import type { Checkpoint, EventMeta, Job, RunEvent, RunSetting, Storage } from "@perstack/core"
import { createKeyStrategy, type KeyStrategy } from "./key-strategy.js"
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

export interface S3StorageBaseConfig {
  client: S3Client
  bucket: string
  prefix?: string
}

export class S3StorageBase implements Storage {
  protected readonly client: S3Client
  protected readonly bucket: string
  protected readonly keyStrategy: KeyStrategy

  constructor(config: S3StorageBaseConfig) {
    this.client = config.client
    this.bucket = config.bucket
    this.keyStrategy = createKeyStrategy(config.prefix ?? "")
  }

  async storeCheckpoint(checkpoint: Checkpoint): Promise<void> {
    const key = this.keyStrategy.getCheckpointKey(checkpoint.jobId, checkpoint.id)
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: serializeCheckpoint(checkpoint),
        ContentType: "application/json",
      }),
    )
  }

  async retrieveCheckpoint(jobId: string, checkpointId: string): Promise<Checkpoint> {
    const key = this.keyStrategy.getCheckpointKey(jobId, checkpointId)
    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      )
      const body = await response.Body?.transformToString()
      if (!body) {
        throw new Error(`checkpoint not found: ${checkpointId}`)
      }
      return deserializeCheckpoint(body)
    } catch (error) {
      if ((error as { name?: string }).name === "NoSuchKey") {
        throw new Error(`checkpoint not found: ${checkpointId}`)
      }
      throw error
    }
  }

  async getCheckpointsByJobId(jobId: string): Promise<Checkpoint[]> {
    const prefix = this.keyStrategy.getCheckpointsPrefix(jobId)
    const keys = await this.listKeys(prefix)
    const checkpoints: Checkpoint[] = []
    for (const key of keys) {
      if (!key.endsWith(".json")) continue
      try {
        const response = await this.client.send(
          new GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
          }),
        )
        const body = await response.Body?.transformToString()
        if (body) {
          checkpoints.push(deserializeCheckpoint(body))
        }
      } catch {
        // Ignore invalid checkpoints
      }
    }
    return checkpoints.sort((a, b) => a.stepNumber - b.stepNumber)
  }

  async storeEvent(event: RunEvent): Promise<void> {
    const key = this.keyStrategy.getEventKey(
      event.jobId,
      event.runId,
      event.timestamp,
      event.stepNumber,
      event.type,
    )
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: serializeEvent(event),
        ContentType: "application/json",
      }),
    )
  }

  async getEventsByRun(jobId: string, runId: string): Promise<EventMeta[]> {
    const prefix = this.keyStrategy.getEventsPrefix(jobId, runId)
    const keys = await this.listKeys(prefix)
    const events: EventMeta[] = []
    for (const key of keys) {
      const parsed = this.keyStrategy.parseEventKey(key)
      if (parsed) {
        events.push(parsed)
      }
    }
    return events.sort((a, b) => a.stepNumber - b.stepNumber)
  }

  async getEventContents(jobId: string, runId: string, maxStep?: number): Promise<RunEvent[]> {
    const prefix = this.keyStrategy.getEventsPrefix(jobId, runId)
    const keys = await this.listKeys(prefix)
    const eventMetas: Array<{ key: string; timestamp: number; stepNumber: number }> = []
    for (const key of keys) {
      const parsed = this.keyStrategy.parseEventKey(key)
      if (parsed && (maxStep === undefined || parsed.stepNumber <= maxStep)) {
        eventMetas.push({ key, ...parsed })
      }
    }
    eventMetas.sort((a, b) => a.timestamp - b.timestamp)
    const events: RunEvent[] = []
    for (const { key } of eventMetas) {
      try {
        const response = await this.client.send(
          new GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
          }),
        )
        const body = await response.Body?.transformToString()
        if (body) {
          events.push(deserializeEvent(body))
        }
      } catch {
        // Ignore invalid events
      }
    }
    return events
  }

  async storeJob(job: Job): Promise<void> {
    const key = this.keyStrategy.getJobKey(job.id)
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: serializeJob(job),
        ContentType: "application/json",
      }),
    )
  }

  async retrieveJob(jobId: string): Promise<Job | undefined> {
    const key = this.keyStrategy.getJobKey(jobId)
    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      )
      const body = await response.Body?.transformToString()
      if (!body) {
        return undefined
      }
      return deserializeJob(body)
    } catch (error) {
      if ((error as { name?: string }).name === "NoSuchKey") {
        return undefined
      }
      throw error
    }
  }

  async getAllJobs(): Promise<Job[]> {
    const prefix = this.keyStrategy.getJobsPrefix()
    const keys = await this.listKeys(prefix)
    const jobKeys = keys.filter((key) => key.endsWith("/job.json"))
    const jobs: Job[] = []
    for (const key of jobKeys) {
      try {
        const response = await this.client.send(
          new GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
          }),
        )
        const body = await response.Body?.transformToString()
        if (body) {
          jobs.push(deserializeJob(body))
        }
      } catch {
        // Ignore invalid jobs
      }
    }
    return jobs.sort((a, b) => b.startedAt - a.startedAt)
  }

  async storeRunSetting(setting: RunSetting): Promise<void> {
    const key = this.keyStrategy.getRunSettingKey(setting.jobId, setting.runId)
    let existingSetting: RunSetting | undefined
    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      )
      const body = await response.Body?.transformToString()
      if (body) {
        existingSetting = deserializeRunSetting(body)
      }
    } catch {
      // Key doesn't exist, will create new
    }
    const settingToStore = existingSetting ? { ...existingSetting, updatedAt: Date.now() } : setting
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: serializeRunSetting(settingToStore),
        ContentType: "application/json",
      }),
    )
  }

  async getAllRuns(): Promise<RunSetting[]> {
    const prefix = this.keyStrategy.getJobsPrefix()
    const keys = await this.listKeys(prefix)
    const runSettingKeys = keys.filter((key) => key.endsWith("/run-setting.json"))
    const runs: RunSetting[] = []
    for (const key of runSettingKeys) {
      try {
        const response = await this.client.send(
          new GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
          }),
        )
        const body = await response.Body?.transformToString()
        if (body) {
          runs.push(deserializeRunSetting(body))
        }
      } catch {
        // Ignore invalid run settings
      }
    }
    return runs.sort((a, b) => b.updatedAt - a.updatedAt)
  }

  protected async listKeys(prefix: string): Promise<string[]> {
    const keys: string[] = []
    let continuationToken: string | undefined
    do {
      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      )
      if (response.Contents) {
        for (const obj of response.Contents) {
          if (obj.Key) {
            keys.push(obj.Key)
          }
        }
      }
      continuationToken = response.NextContinuationToken
    } while (continuationToken)
    return keys
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    )
  }
}
