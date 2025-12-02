import { existsSync, statSync } from "node:fs"
import fs from "node:fs/promises"
import { afterEach, describe, expect, it } from "vitest"
import { validatePath } from "../lib/path.js"
import { createDirectory } from "./create-directory.js"

const dirName = "create-directory-test"
describe("createDirectory tool", () => {
  afterEach(async () => {
    await fs.rm(dirName, { recursive: true, force: true })
  })

  it("creates new directory successfully", async () => {
    const newDir = await createDirectory({ path: dirName })
    expect(existsSync(newDir.path)).toBe(true)
    const stats = statSync(newDir.path)
    expect(stats.isDirectory()).toBe(true)
    expect(stats.mode & 0o200).toBeTruthy()
  })

  it("throws error if directory already exists", async () => {
    await fs.mkdir(dirName)
    await expect(createDirectory({ path: dirName })).rejects.toThrow(
      `Directory ${dirName} already exists`,
    )
  })

  it("throws error if parent directory is not writable", async () => {
    await fs.mkdir(dirName)
    await fs.chmod(dirName, 0o444)
    const validatedPath = await validatePath(dirName)
    await expect(createDirectory({ path: `${dirName}/new-dir` })).rejects.toThrow(
      `Parent directory ${validatedPath} is not writable`,
    )
  })
})
