import { existsSync, readdirSync, readFileSync } from "node:fs"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import {
  type Checkpoint,
  checkpointSchema,
  type EventMeta,
  type Job,
  jobSchema,
  type RunEvent,
  type RunSetting,
  runSettingSchema,
  type Storage,
} from "@perstack/core"

export interface FileSystemStorageConfig {
  basePath?: string
}

export class FileSystemStorage implements Storage {
  private readonly basePath: string

  constructor(config: FileSystemStorageConfig = {}) {
    this.basePath = config.basePath ?? `${process.cwd()}/perstack`
  }

  private getJobsDir(): string {
    return `${this.basePath}/jobs`
  }

  private getJobDir(jobId: string): string {
    return `${this.getJobsDir()}/${jobId}`
  }

  private getCheckpointDir(jobId: string): string {
    return `${this.getJobDir(jobId)}/checkpoints`
  }

  private getCheckpointPath(jobId: string, checkpointId: string): string {
    return `${this.getCheckpointDir(jobId)}/${checkpointId}.json`
  }

  private getRunDir(jobId: string, runId: string): string {
    return `${this.getJobDir(jobId)}/runs/${runId}`
  }

  async storeCheckpoint(checkpoint: Checkpoint): Promise<void> {
    const { id, jobId } = checkpoint
    const checkpointDir = this.getCheckpointDir(jobId)
    await mkdir(checkpointDir, { recursive: true })
    await writeFile(this.getCheckpointPath(jobId, id), JSON.stringify(checkpoint))
  }

  async retrieveCheckpoint(jobId: string, checkpointId: string): Promise<Checkpoint> {
    const checkpointPath = this.getCheckpointPath(jobId, checkpointId)
    if (!existsSync(checkpointPath)) {
      throw new Error(`checkpoint not found: ${checkpointId}`)
    }
    const checkpoint = await readFile(checkpointPath, "utf8")
    return checkpointSchema.parse(JSON.parse(checkpoint))
  }

  async getCheckpointsByJobId(jobId: string): Promise<Checkpoint[]> {
    const checkpointDir = this.getCheckpointDir(jobId)
    if (!existsSync(checkpointDir)) {
      return []
    }
    const files = readdirSync(checkpointDir).filter((file) => file.endsWith(".json"))
    const checkpoints: Checkpoint[] = []
    for (const file of files) {
      try {
        const content = readFileSync(path.resolve(checkpointDir, file), "utf-8")
        checkpoints.push(checkpointSchema.parse(JSON.parse(content)))
      } catch {
        // Ignore invalid checkpoints
      }
    }
    return checkpoints.sort((a, b) => a.stepNumber - b.stepNumber)
  }

  async storeEvent(event: RunEvent): Promise<void> {
    const { timestamp, jobId, runId, stepNumber, type } = event
    const runDir = this.getRunDir(jobId, runId)
    const eventPath = `${runDir}/event-${timestamp}-${stepNumber}-${type}.json`
    await mkdir(runDir, { recursive: true })
    await writeFile(eventPath, JSON.stringify(event))
  }

  async getEventsByRun(jobId: string, runId: string): Promise<EventMeta[]> {
    const runDir = this.getRunDir(jobId, runId)
    if (!existsSync(runDir)) {
      return []
    }
    return readdirSync(runDir)
      .filter((file) => file.startsWith("event-"))
      .map((file) => {
        const parts = file.split(".")[0].split("-")
        return {
          timestamp: Number(parts[1]),
          stepNumber: Number(parts[2]),
          type: parts.slice(3).join("-"),
        }
      })
      .sort((a, b) => a.stepNumber - b.stepNumber)
  }

  async getEventContents(jobId: string, runId: string, maxStep?: number): Promise<RunEvent[]> {
    const runDir = this.getRunDir(jobId, runId)
    if (!existsSync(runDir)) {
      return []
    }
    const eventFiles = readdirSync(runDir)
      .filter((file) => file.startsWith("event-"))
      .map((file) => {
        const parts = file.split(".")[0].split("-")
        return {
          file,
          timestamp: Number(parts[1]),
          stepNumber: Number(parts[2]),
          type: parts.slice(3).join("-"),
        }
      })
      .filter((e) => maxStep === undefined || e.stepNumber <= maxStep)
      .sort((a, b) => a.timestamp - b.timestamp)
    const events: RunEvent[] = []
    for (const { file } of eventFiles) {
      try {
        const content = readFileSync(path.resolve(runDir, file), "utf-8")
        events.push(JSON.parse(content) as RunEvent)
      } catch {
        // Ignore invalid events
      }
    }
    return events
  }

  async storeJob(job: Job): Promise<void> {
    const jobDir = this.getJobDir(job.id)
    if (!existsSync(jobDir)) {
      await mkdir(jobDir, { recursive: true })
    }
    const jobPath = path.resolve(jobDir, "job.json")
    await writeFile(jobPath, JSON.stringify(job, null, 2))
  }

  async retrieveJob(jobId: string): Promise<Job | undefined> {
    const jobDir = this.getJobDir(jobId)
    const jobPath = path.resolve(jobDir, "job.json")
    if (!existsSync(jobPath)) {
      return undefined
    }
    const content = readFileSync(jobPath, "utf-8")
    return jobSchema.parse(JSON.parse(content))
  }

  async getAllJobs(): Promise<Job[]> {
    const jobsDir = this.getJobsDir()
    if (!existsSync(jobsDir)) {
      return []
    }
    const jobDirNames = readdirSync(jobsDir, { withFileTypes: true })
      .filter((dir) => dir.isDirectory())
      .map((dir) => dir.name)
    if (jobDirNames.length === 0) {
      return []
    }
    const jobs: Job[] = []
    for (const jobDirName of jobDirNames) {
      const jobPath = path.resolve(jobsDir, jobDirName, "job.json")
      if (!existsSync(jobPath)) {
        continue
      }
      try {
        const content = readFileSync(jobPath, "utf-8")
        jobs.push(jobSchema.parse(JSON.parse(content)))
      } catch {
        // Ignore invalid jobs
      }
    }
    return jobs.sort((a, b) => b.startedAt - a.startedAt)
  }

  async storeRunSetting(setting: RunSetting): Promise<void> {
    const runDir = this.getRunDir(setting.jobId, setting.runId)
    const runSettingPath = path.resolve(runDir, "run-setting.json")
    if (existsSync(runSettingPath)) {
      const existingSetting = runSettingSchema.parse(
        JSON.parse(readFileSync(runSettingPath, "utf-8")),
      )
      existingSetting.updatedAt = Date.now()
      await writeFile(runSettingPath, JSON.stringify(existingSetting), "utf-8")
    } else {
      await mkdir(runDir, { recursive: true })
      await writeFile(runSettingPath, JSON.stringify(setting), "utf-8")
    }
  }

  async getAllRuns(): Promise<RunSetting[]> {
    const jobsDir = this.getJobsDir()
    if (!existsSync(jobsDir)) {
      return []
    }
    const jobDirNames = readdirSync(jobsDir, { withFileTypes: true })
      .filter((dir) => dir.isDirectory())
      .map((dir) => dir.name)
    if (jobDirNames.length === 0) {
      return []
    }
    const runs: RunSetting[] = []
    for (const jobDirName of jobDirNames) {
      const runsDir = path.resolve(jobsDir, jobDirName, "runs")
      if (!existsSync(runsDir)) {
        continue
      }
      const runDirNames = readdirSync(runsDir, { withFileTypes: true })
        .filter((dir) => dir.isDirectory())
        .map((dir) => dir.name)
      for (const runDirName of runDirNames) {
        const runSettingPath = path.resolve(runsDir, runDirName, "run-setting.json")
        if (!existsSync(runSettingPath)) {
          continue
        }
        try {
          const content = readFileSync(runSettingPath, "utf-8")
          runs.push(runSettingSchema.parse(JSON.parse(content)))
        } catch {
          // Ignore invalid runs
        }
      }
    }
    return runs.sort((a, b) => b.updatedAt - a.updatedAt)
  }
}
