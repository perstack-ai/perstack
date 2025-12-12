import { existsSync, readdirSync, readFileSync } from "node:fs"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import type { RunEvent } from "@perstack/core"
import { defaultGetRunDir as getRunDir } from "./run-setting.js"

export async function defaultStoreEvent(event: RunEvent): Promise<void> {
  const { timestamp, jobId, runId, stepNumber, type } = event
  const runDir = getRunDir(jobId, runId)
  const eventPath = `${runDir}/event-${timestamp}-${stepNumber}-${type}.json`
  await mkdir(runDir, { recursive: true })
  await writeFile(eventPath, JSON.stringify(event))
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
