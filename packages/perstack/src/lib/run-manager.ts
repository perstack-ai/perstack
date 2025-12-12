import { existsSync, readFileSync } from "node:fs"
import type { Checkpoint, Job, RunEvent, RunSetting } from "@perstack/core"
import { checkpointSchema } from "@perstack/core"
import {
  getCheckpointPath,
  getEventsByRun,
  getAllJobs as runtimeGetAllJobs,
  getAllRuns as runtimeGetAllRuns,
  getCheckpointsByJobId as runtimeGetCheckpointsByJobId,
  getEventContents as runtimeGetEventContents,
} from "@perstack/storage"

export function getAllJobs(): Job[] {
  return runtimeGetAllJobs()
}

export function getAllRuns(): RunSetting[] {
  return runtimeGetAllRuns()
}

export function getMostRecentRun(): RunSetting {
  const runs = getAllRuns()
  if (runs.length === 0) {
    throw new Error("No runs found")
  }
  return runs[0]
}

export function getMostRecentRunId(): string {
  return getMostRecentRun().runId
}

export function getRunsByJobId(jobId: string): RunSetting[] {
  return getAllRuns().filter((r) => r.jobId === jobId)
}

export function getMostRecentRunInJob(jobId: string): RunSetting {
  const runs = getRunsByJobId(jobId)
  if (runs.length === 0) {
    throw new Error(`No runs found for job ${jobId}`)
  }
  return runs[0]
}

export function getCheckpointsByJobId(jobId: string): Checkpoint[] {
  return runtimeGetCheckpointsByJobId(jobId)
}

export function getMostRecentCheckpoint(jobId?: string): Checkpoint {
  const targetJobId = jobId ?? getMostRecentRun().jobId
  const checkpoints = getCheckpointsByJobId(targetJobId)
  if (checkpoints.length === 0) {
    throw new Error(`No checkpoints found for job ${targetJobId}`)
  }
  return checkpoints[checkpoints.length - 1]
}

export function getRecentExperts(
  limit: number,
): Array<{ key: string; name: string; lastUsed: number }> {
  const runs = getAllRuns()
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

export function getCheckpointById(jobId: string, checkpointId: string): Checkpoint {
  const checkpointPath = getCheckpointPath(jobId, checkpointId)
  if (!existsSync(checkpointPath)) {
    throw new Error(`Checkpoint ${checkpointId} not found in job ${jobId}`)
  }
  const checkpoint = readFileSync(checkpointPath, "utf-8")
  return checkpointSchema.parse(JSON.parse(checkpoint))
}

export function getCheckpointsWithDetails(
  jobId: string,
): { id: string; runId: string; stepNumber: number; contextWindowUsage: number }[] {
  return getCheckpointsByJobId(jobId)
    .map((cp) => ({
      id: cp.id,
      runId: cp.runId,
      stepNumber: cp.stepNumber,
      contextWindowUsage: cp.contextWindowUsage ?? 0,
    }))
    .sort((a, b) => b.stepNumber - a.stepNumber)
}

export function getEventsWithDetails(
  jobId: string,
  runId: string,
  stepNumber?: number,
): { id: string; runId: string; stepNumber: number; type: string; timestamp: number }[] {
  return getEventsByRun(jobId, runId)
    .map((e) => ({
      id: `${e.timestamp}-${e.stepNumber}-${e.type}`,
      runId,
      stepNumber: e.stepNumber,
      type: e.type,
      timestamp: e.timestamp,
    }))
    .filter((event) => stepNumber === undefined || event.stepNumber === stepNumber)
    .sort((a, b) => a.timestamp - b.timestamp)
}

export function getEventContents(jobId: string, runId: string, maxStepNumber?: number): RunEvent[] {
  return runtimeGetEventContents(jobId, runId, maxStepNumber)
}
