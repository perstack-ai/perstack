import { existsSync } from "node:fs"
import fs from "node:fs/promises"
import { afterEach, describe, expect, it } from "vitest"
import { validatePath } from "../lib/path.js"
import { deleteDirectory } from "./delete-directory.js"

const testDir = "delete-directory-test"

describe("deleteDirectory tool", () => {
  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true })
  })

  it("deletes empty directory successfully", async () => {
    await fs.mkdir(testDir)
    const result = await deleteDirectory({ path: testDir })
    expect(existsSync(testDir)).toBe(false)
    expect(result).toStrictEqual({ path: await validatePath(testDir) })
  })

  it("deletes non-empty directory with recursive flag", async () => {
    await fs.mkdir(testDir)
    await fs.writeFile(`${testDir}/file.txt`, "content")
    const result = await deleteDirectory({ path: testDir, recursive: true })
    expect(existsSync(testDir)).toBe(false)
    expect(result).toStrictEqual({ path: await validatePath(testDir) })
  })

  it("throws error if directory does not exist", async () => {
    await expect(deleteDirectory({ path: "nonexistent" })).rejects.toThrow("does not exist")
  })

  it("throws error if path is a file", async () => {
    await fs.mkdir(testDir)
    const filePath = `${testDir}/file.txt`
    await fs.writeFile(filePath, "content")
    await expect(deleteDirectory({ path: filePath })).rejects.toThrow("is not a directory")
  })

  it("throws error for non-empty directory without recursive flag", async () => {
    await fs.mkdir(testDir)
    await fs.writeFile(`${testDir}/file.txt`, "content")
    await expect(deleteDirectory({ path: testDir })).rejects.toThrow()
  })
})
