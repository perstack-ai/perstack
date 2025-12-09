import { existsSync } from "node:fs"
import { mkdir, readFile, writeFile } from "node:fs/promises"
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
