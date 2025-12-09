import { existsSync, readdirSync, readFileSync } from "node:fs"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import type { RunEvent } from "@perstack/core"
import { type Checkpoint, checkpointSchema } from "@perstack/core"
import { getJobDir } from "./job-store.js"
import { defaultGetRunDir as getRunDir } from "./run-setting-store.js"

export function getCheckpointDir(jobId: string): string {
  return `${getJobDir(jobId)}/checkpoints`
}

export function getCheckpointPath(jobId: string, checkpointId: string): string {
  return `${getCheckpointDir(jobId)}/${checkpointId}.json`
}

export async function defaultRetrieveCheckpoint(
  jobId: string,
  checkpointId: string,
): Promise<Checkpoint> {
  const checkpointPath = getCheckpointPath(jobId, checkpointId)
  if (!existsSync(checkpointPath)) {
    throw new Error(`checkpoint not found: ${checkpointId}`)
  }
  const checkpoint = await readFile(checkpointPath, "utf8")
  return checkpointSchema.parse(JSON.parse(checkpoint))
}

export async function defaultStoreCheckpoint(checkpoint: Checkpoint): Promise<void> {
  const { id, jobId } = checkpoint
  const checkpointDir = getCheckpointDir(jobId)
  await mkdir(checkpointDir, { recursive: true })
  await writeFile(getCheckpointPath(jobId, id), JSON.stringify(checkpoint))
}

export async function defaultStoreEvent(event: RunEvent): Promise<void> {
  const { timestamp, jobId, runId, stepNumber, type } = event
  const runDir = getRunDir(jobId, runId)
  const eventPath = `${runDir}/event-${timestamp}-${stepNumber}-${type}.json`
  await mkdir(runDir, { recursive: true })
  await writeFile(eventPath, JSON.stringify(event))
}

export function getCheckpointsByJobId(jobId: string): Checkpoint[] {
  const checkpointDir = getCheckpointDir(jobId)
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

export function getEventsByRun(
  jobId: string,
  runId: string,
): { timestamp: number; stepNumber: number; type: string }[] {
  const runDir = getRunDir(jobId, runId)
  if (!existsSync(runDir)) {
    return []
  }
  return readdirSync(runDir)
    .filter((file) => file.startsWith("event-"))
    .map((file) => {
      const [_, timestamp, stepNumber, type] = file.split(".")[0].split("-")
      return { timestamp: Number(timestamp), stepNumber: Number(stepNumber), type }
    })
    .sort((a, b) => a.stepNumber - b.stepNumber)
}

export function getEventContents(jobId: string, runId: string, maxStepNumber?: number): RunEvent[] {
  const runDir = getRunDir(jobId, runId)
  if (!existsSync(runDir)) {
    return []
  }
  const eventFiles = readdirSync(runDir)
    .filter((file) => file.startsWith("event-"))
    .map((file) => {
      const [_, timestamp, step, type] = file.split(".")[0].split("-")
      return { file, timestamp: Number(timestamp), stepNumber: Number(step), type }
    })
    .filter((e) => maxStepNumber === undefined || e.stepNumber <= maxStepNumber)
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
