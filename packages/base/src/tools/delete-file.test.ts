import { existsSync } from "node:fs"
import fs from "node:fs/promises"
import { afterEach, describe, expect, it } from "vitest"
import { validatePath } from "../lib/path.js"
import { deleteFile } from "./delete-file.js"

const testFile = "delete-file.test.txt"
describe("deleteFile tool", () => {
  afterEach(async () => {
    await fs.rm(testFile, { force: true })
  })

  it("deletes existing file successfully", async () => {
    await fs.writeFile(testFile, "test content")
    const result = await deleteFile({ path: testFile })
    expect(existsSync(testFile)).toBe(false)
    expect(result).toStrictEqual({ path: await validatePath(testFile) })
  })

  it("throws error if file does not exist", async () => {
    await expect(deleteFile({ path: "nonexistent.txt" })).rejects.toThrow("does not exist")
  })

  it("throws error if path is a directory", async () => {
    const testDir = "test-directory"
    if (existsSync(testDir)) {
      await fs.rmdir(testDir)
    }
    await fs.mkdir(testDir)
    await expect(deleteFile({ path: testDir })).rejects.toThrow("is a directory")
    if (existsSync(testDir)) {
      await fs.rmdir(testDir)
    }
  })

  it("throws error if file is not writable", async () => {
    await fs.writeFile(testFile, "readonly content")
    await fs.chmod(testFile, 0o444)
    await expect(deleteFile({ path: testFile })).rejects.toThrow("not writable")
    await fs.chmod(testFile, 0o644)
  })
})
