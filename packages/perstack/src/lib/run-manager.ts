import { existsSync } from "node:fs"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { type Checkpoint, checkpointSchema, type RunEvent, type RunSetting } from "@perstack/core"
import { getRunDir } from "@perstack/runtime"

export async function getAllRuns(): Promise<RunSetting[]> {
  const dataDir = path.resolve(process.cwd(), "perstack")
  if (!existsSync(dataDir)) {
    return []
  }
  const runsDir = path.resolve(dataDir, "runs")
  if (!existsSync(runsDir)) {
    return []
  }
  const runDirs = await readdir(runsDir, { withFileTypes: true }).then((dirs) =>
    dirs.filter((dir) => dir.isDirectory()).map((dir) => dir.name),
  )
  if (runDirs.length === 0) {
    return []
  }

  const runs: RunSetting[] = []
  for (const runDir of runDirs) {
    const runSettingPath = path.resolve(runsDir, runDir, "run-setting.json")
    try {
      const runSetting = await readFile(runSettingPath, "utf-8")
      runs.push(JSON.parse(runSetting) as RunSetting)
    } catch {
      // Ignore invalid runs
    }
  }
  return runs.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function getMostRecentRunId(): Promise<string> {
  const runs = await getAllRuns()
  if (runs.length === 0) {
    throw new Error("No runs found")
  }
  return runs[0].runId
}

export async function getCheckpoints(
  runId: string,
): Promise<{ timestamp: string; stepNumber: string; id: string }[]> {
  const runDir = getRunDir(runId)
  if (!existsSync(runDir)) {
    return []
  }
  return await readdir(runDir).then((files) =>
    files
      .filter((file) => file.startsWith("checkpoint-"))
      .map((file) => {
        const [_, timestamp, stepNumber, id] = file.split(".")[0].split("-")
        return {
          timestamp,
          stepNumber,
          id,
        }
      })
      .sort((a, b) => Number(a.stepNumber) - Number(b.stepNumber)),
  )
}

export async function getCheckpoint(checkpointId: string): Promise<Checkpoint> {
  const runId = await getMostRecentRunId()
  const runDir = getRunDir(runId)
  const checkpointPath = path.resolve(runDir, `checkpoint-${checkpointId}.json`)
  const checkpoint = await readFile(checkpointPath, "utf-8")
  return checkpointSchema.parse(JSON.parse(checkpoint))
}

export async function getMostRecentCheckpoint(runId?: string): Promise<Checkpoint> {
  const runIdForCheckpoint = runId ?? (await getMostRecentRunId())
  const runDir = getRunDir(runIdForCheckpoint)
  const checkpointFiles = await readdir(runDir, { withFileTypes: true }).then((files) =>
    files.filter((file) => file.isFile() && file.name.startsWith("checkpoint-")),
  )
  if (checkpointFiles.length === 0) {
    throw new Error(`No checkpoints found for run ${runIdForCheckpoint}`)
  }
  const checkpoints = await Promise.all(
    checkpointFiles.map(async (file) => {
      const checkpointPath = path.resolve(runDir, file.name)
      const checkpoint = await readFile(checkpointPath, "utf-8")
      return checkpointSchema.parse(JSON.parse(checkpoint))
    }),
  )
  return checkpoints.sort((a, b) => b.stepNumber - a.stepNumber)[0]
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
  runId: string,
): Promise<{ timestamp: string; stepNumber: string; type: string }[]> {
  const runDir = getRunDir(runId)
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
export async function getCheckpointById(runId: string, checkpointId: string): Promise<Checkpoint> {
  const runDir = getRunDir(runId)
  const files = await readdir(runDir)
  const checkpointFile = files.find(
    (file) => file.startsWith("checkpoint-") && file.includes(`-${checkpointId}.`),
  )
  if (!checkpointFile) {
    throw new Error(`Checkpoint ${checkpointId} not found in run ${runId}`)
  }
  const checkpointPath = path.resolve(runDir, checkpointFile)
  const checkpoint = await readFile(checkpointPath, "utf-8")
  return checkpointSchema.parse(JSON.parse(checkpoint))
}
export async function getCheckpointsWithDetails(
  runId: string,
): Promise<
  { id: string; runId: string; stepNumber: number; timestamp: number; contextWindowUsage: number }[]
> {
  const runDir = getRunDir(runId)
  if (!existsSync(runDir)) {
    return []
  }
  const files = await readdir(runDir)
  const checkpointFiles = files.filter((file) => file.startsWith("checkpoint-"))
  const checkpoints = await Promise.all(
    checkpointFiles.map(async (file) => {
      const [_, timestamp, stepNumber, id] = file.split(".")[0].split("-")
      const checkpointPath = path.resolve(runDir, file)
      const content = await readFile(checkpointPath, "utf-8")
      const checkpoint = checkpointSchema.parse(JSON.parse(content))
      return {
        id,
        runId,
        stepNumber: Number(stepNumber),
        timestamp: Number(timestamp),
        contextWindowUsage: checkpoint.contextWindowUsage ?? 0,
      }
    }),
  )
  return checkpoints.sort((a, b) => b.stepNumber - a.stepNumber)
}
export async function getEventsWithDetails(
  runId: string,
  stepNumber?: number,
): Promise<{ id: string; runId: string; stepNumber: number; type: string; timestamp: number }[]> {
  const runDir = getRunDir(runId)
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
export async function getEventContents(runId: string, maxStepNumber?: number): Promise<RunEvent[]> {
  const runDir = getRunDir(runId)
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
