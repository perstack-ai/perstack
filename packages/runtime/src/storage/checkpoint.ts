import { existsSync, readdirSync, readFileSync } from "node:fs"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { type Checkpoint, checkpointSchema } from "@perstack/core"
import { getJobDir } from "./job.js"

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
