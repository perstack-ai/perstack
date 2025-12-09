import path from "node:path"
import { type RunSetting, runSettingSchema } from "@perstack/core"

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
