import { existsSync, readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { type RunSetting, runSettingSchema } from "@perstack/core"
import { getJobsDir } from "./job.js"

export type FileSystem = {
  existsSync: (path: string) => boolean
  mkdir: (path: string, options: { recursive: boolean }) => Promise<void>
  readFile: (path: string, encoding: BufferEncoding) => Promise<string>
  writeFile: (path: string, data: string, encoding: BufferEncoding) => Promise<void>
}

export type GetRunDirFn = (jobId: string, runId: string) => string

export async function createDefaultFileSystem(): Promise<FileSystem> {
  const fs = await import("node:fs")
  const fsPromises = await import("node:fs/promises")
  return {
    existsSync: fs.existsSync,
    mkdir: async (p, options) => {
      await fsPromises.mkdir(p, options)
    },
    readFile: fsPromises.readFile,
    writeFile: fsPromises.writeFile,
  }
}

export function defaultGetRunDir(jobId: string, runId: string): string {
  return `${process.cwd()}/perstack/jobs/${jobId}/runs/${runId}`
}

export async function storeRunSetting(
  setting: RunSetting,
  fs?: FileSystem,
  getRunDir: GetRunDirFn = defaultGetRunDir,
): Promise<void> {
  const fileSystem = fs ?? (await createDefaultFileSystem())
  const runDir = getRunDir(setting.jobId, setting.runId)
  if (fileSystem.existsSync(runDir)) {
    const runSettingPath = path.resolve(runDir, "run-setting.json")
    const runSetting = runSettingSchema.parse(
      JSON.parse(await fileSystem.readFile(runSettingPath, "utf-8")),
    )
    runSetting.updatedAt = Date.now()
    await fileSystem.writeFile(runSettingPath, JSON.stringify(runSetting), "utf-8")
  } else {
    await fileSystem.mkdir(runDir, { recursive: true })
    await fileSystem.writeFile(
      path.resolve(runDir, "run-setting.json"),
      JSON.stringify(setting),
      "utf-8",
    )
  }
}

export function getAllRuns(): RunSetting[] {
  const jobsDir = getJobsDir()
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
