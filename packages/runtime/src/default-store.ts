import { mkdir, readdir, readFile, writeFile } from "node:fs/promises"
import type { RunEvent } from "@perstack/core"
import { type Checkpoint, checkpointSchema } from "@perstack/core"
import { defaultGetRunDir as getRunDir } from "./run-setting-store.js"

export async function defaultRetrieveCheckpoint(
  runId: string,
  checkpointId: string,
): Promise<Checkpoint> {
  const runDir = getRunDir(runId)
  const checkpointFiles = await readdir(runDir, { withFileTypes: true }).then((files) =>
    files.filter((file) => file.isFile() && file.name.startsWith("checkpoint-")),
  )
  const checkpointFile = checkpointFiles.find((file) => file.name.endsWith(`-${checkpointId}.json`))
  if (!checkpointFile) {
    throw new Error(`checkpoint not found: ${runId} ${checkpointId}`)
  }
  const checkpointPath = `${runDir}/${checkpointFile.name}`
  const checkpoint = await readFile(checkpointPath, "utf8")
  return checkpointSchema.parse(JSON.parse(checkpoint))
}

export async function defaultStoreCheckpoint(
  checkpoint: Checkpoint,
  timestamp: number,
): Promise<void> {
  const { id, runId, stepNumber } = checkpoint
  const runDir = getRunDir(runId)
  const checkpointPath = `${runDir}/checkpoint-${timestamp}-${stepNumber}-${id}.json`
  await mkdir(runDir, { recursive: true })
  await writeFile(checkpointPath, JSON.stringify(checkpoint))
}

export async function defaultStoreEvent(event: RunEvent): Promise<void> {
  const { timestamp, runId, stepNumber, type } = event
  const runDir = getRunDir(runId)
  const eventPath = `${runDir}/event-${timestamp}-${stepNumber}-${type}.json`
  await mkdir(runDir, { recursive: true })
  await writeFile(eventPath, JSON.stringify(event))
}
