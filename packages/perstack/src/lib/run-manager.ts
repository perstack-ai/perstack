import { existsSync } from "node:fs"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import {
  type Checkpoint,
  checkpointSchema,
  type Job,
  jobSchema,
  type RunEvent,
  type RunSetting,
} from "@perstack/core"
import { getCheckpointDir, getCheckpointPath, getRunDir } from "@perstack/runtime"

export async function getAllJobs(): Promise<Job[]> {
  const dataDir = path.resolve(process.cwd(), "perstack")
  if (!existsSync(dataDir)) {
    return []
  }
  const jobsDir = path.resolve(dataDir, "jobs")
  if (!existsSync(jobsDir)) {
    return []
  }
  const jobDirs = await readdir(jobsDir, { withFileTypes: true }).then((dirs) =>
    dirs.filter((dir) => dir.isDirectory()).map((dir) => dir.name),
  )
  if (jobDirs.length === 0) {
    return []
  }
  const jobs: Job[] = []
  for (const jobDir of jobDirs) {
    const jobPath = path.resolve(jobsDir, jobDir, "job.json")
    try {
      const jobContent = await readFile(jobPath, "utf-8")
      jobs.push(jobSchema.parse(JSON.parse(jobContent)))
    } catch {
      // Ignore invalid jobs
    }
  }
  return jobs.sort((a, b) => b.startedAt - a.startedAt)
}

export async function getAllRuns(): Promise<RunSetting[]> {
  const dataDir = path.resolve(process.cwd(), "perstack")
  if (!existsSync(dataDir)) {
    return []
  }
  const jobsDir = path.resolve(dataDir, "jobs")
  if (!existsSync(jobsDir)) {
    return []
  }
  const jobDirs = await readdir(jobsDir, { withFileTypes: true }).then((dirs) =>
    dirs.filter((dir) => dir.isDirectory()).map((dir) => dir.name),
  )
  if (jobDirs.length === 0) {
    return []
  }
  const runs: RunSetting[] = []
  for (const jobDir of jobDirs) {
    const runsDir = path.resolve(jobsDir, jobDir, "runs")
    if (!existsSync(runsDir)) {
      continue
    }
    const runDirs = await readdir(runsDir, { withFileTypes: true }).then((dirs) =>
      dirs.filter((dir) => dir.isDirectory()).map((dir) => dir.name),
    )
    for (const runDir of runDirs) {
      const runSettingPath = path.resolve(runsDir, runDir, "run-setting.json")
      try {
        const runSetting = await readFile(runSettingPath, "utf-8")
        runs.push(JSON.parse(runSetting) as RunSetting)
      } catch {
        // Ignore invalid runs
      }
    }
  }
  return runs.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function getMostRecentRun(): Promise<RunSetting> {
  const runs = await getAllRuns()
  if (runs.length === 0) {
    throw new Error("No runs found")
  }
  return runs[0]
}

export async function getMostRecentRunId(): Promise<string> {
  const run = await getMostRecentRun()
  return run.runId
}

export async function getRunsByJobId(jobId: string): Promise<RunSetting[]> {
  const allRuns = await getAllRuns()
  return allRuns.filter((r) => r.jobId === jobId)
}

export async function getMostRecentRunInJob(jobId: string): Promise<RunSetting> {
  const runs = await getRunsByJobId(jobId)
  if (runs.length === 0) {
    throw new Error(`No runs found for job ${jobId}`)
  }
  return runs[0]
}

export async function getCheckpointsByJobId(jobId: string): Promise<Checkpoint[]> {
  const checkpointDir = getCheckpointDir(jobId)
  if (!existsSync(checkpointDir)) {
    return []
  }
  const files = await readdir(checkpointDir)
  const checkpointFiles = files.filter((file) => file.endsWith(".json"))
  const checkpoints = await Promise.all(
    checkpointFiles.map(async (file) => {
      const checkpointPath = path.resolve(checkpointDir, file)
      const content = await readFile(checkpointPath, "utf-8")
      return checkpointSchema.parse(JSON.parse(content))
    }),
  )
  return checkpoints.sort((a, b) => a.stepNumber - b.stepNumber)
}

export async function getMostRecentCheckpoint(jobId?: string): Promise<Checkpoint> {
  const targetJobId = jobId ?? (await getMostRecentRun()).jobId
  const checkpoints = await getCheckpointsByJobId(targetJobId)
  if (checkpoints.length === 0) {
    throw new Error(`No checkpoints found for job ${targetJobId}`)
  }
  return checkpoints[checkpoints.length - 1]
}

export async function getRecentExperts(
  limit: number,
): Promise<Array<{ key: string; name: string; lastUsed: number }>> {
  const runs = await getAllRuns()
  const expertMap = new Map<string, { key: string; name: string; lastUsed: number }>()
  for (const setting of runs) {
    const expertKey = setting.expertKey
    if (!expertMap.has(expertKey) || expertMap.get(expertKey)!.lastUsed < setting.updatedAt) {
      expertMap.set(expertKey, {
        key: expertKey,
        name: expertKey,
        lastUsed: setting.updatedAt,
      })
    }
  }
  return Array.from(expertMap.values())
    .sort((a, b) => b.lastUsed - a.lastUsed)
    .slice(0, limit)
}

export async function getEvents(
  jobId: string,
  runId: string,
): Promise<{ timestamp: string; stepNumber: string; type: string }[]> {
  const runDir = getRunDir(jobId, runId)
  if (!existsSync(runDir)) {
    return []
  }
  return await readdir(runDir).then((files) =>
    files
      .filter((file) => file.startsWith("event-"))
      .map((file) => {
        const [_, timestamp, stepNumber, type] = file.split(".")[0].split("-")
        return {
          timestamp,
          stepNumber,
          type,
        }
      })
      .sort((a, b) => Number(a.stepNumber) - Number(b.stepNumber)),
  )
}
export async function getCheckpointById(jobId: string, checkpointId: string): Promise<Checkpoint> {
  const checkpointPath = getCheckpointPath(jobId, checkpointId)
  if (!existsSync(checkpointPath)) {
    throw new Error(`Checkpoint ${checkpointId} not found in job ${jobId}`)
  }
  const checkpoint = await readFile(checkpointPath, "utf-8")
  return checkpointSchema.parse(JSON.parse(checkpoint))
}
export async function getCheckpointsWithDetails(
  jobId: string,
): Promise<{ id: string; runId: string; stepNumber: number; contextWindowUsage: number }[]> {
  const checkpoints = await getCheckpointsByJobId(jobId)
  return checkpoints
    .map((cp) => ({
      id: cp.id,
      runId: cp.runId,
      stepNumber: cp.stepNumber,
      contextWindowUsage: cp.contextWindowUsage ?? 0,
    }))
    .sort((a, b) => b.stepNumber - a.stepNumber)
}
export async function getEventsWithDetails(
  jobId: string,
  runId: string,
  stepNumber?: number,
): Promise<{ id: string; runId: string; stepNumber: number; type: string; timestamp: number }[]> {
  const runDir = getRunDir(jobId, runId)
  if (!existsSync(runDir)) {
    return []
  }
  return await readdir(runDir).then((files) =>
    files
      .filter((file) => file.startsWith("event-"))
      .map((file) => {
        const [_, timestamp, step, type] = file.split(".")[0].split("-")
        return {
          id: `${timestamp}-${step}-${type}`,
          runId,
          stepNumber: Number(step),
          type,
          timestamp: Number(timestamp),
        }
      })
      .filter((event) => stepNumber === undefined || event.stepNumber === stepNumber)
      .sort((a, b) => a.timestamp - b.timestamp),
  )
}
export async function getEventContents(
  jobId: string,
  runId: string,
  maxStepNumber?: number,
): Promise<RunEvent[]> {
  const runDir = getRunDir(jobId, runId)
  if (!existsSync(runDir)) {
    return []
  }
  const files = await readdir(runDir)
  const eventFiles = files
    .filter((file) => file.startsWith("event-"))
    .map((file) => {
      const [_, timestamp, step, type] = file.split(".")[0].split("-")
      return { file, timestamp: Number(timestamp), stepNumber: Number(step), type }
    })
    .filter((e) => maxStepNumber === undefined || e.stepNumber <= maxStepNumber)
    .sort((a, b) => a.timestamp - b.timestamp)
  const events: RunEvent[] = []
  for (const { file } of eventFiles) {
    const content = await readFile(path.resolve(runDir, file), "utf-8")
    events.push(JSON.parse(content) as RunEvent)
  }
  return events
}
