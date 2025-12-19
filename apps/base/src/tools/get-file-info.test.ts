import fs from "node:fs/promises"
import { afterEach, describe, expect, it } from "vitest"
import { validatePath } from "../lib/path.js"
import { getFileInfo } from "./get-file-info.js"

const testFile = "get-file-info.test.txt"
const testDir = "test-directory"
describe("getFileInfo tool", () => {
  afterEach(async () => {
    await fs.rm(testFile, { force: true })
    await fs.rm(testDir, { recursive: true, force: true })
  })

  it("gets info for existing text file", async () => {
    const content = "Hello, World!"
    await fs.writeFile(testFile, content)
    const result = await getFileInfo({ path: testFile })
    expect(result.exists).toBe(true)
    expect(result.path).toBe(await validatePath(testFile))
    expect(result.name).toBe(testFile)
    expect(result.extension).toBe(".txt")
    expect(result.type).toBe("file")
    expect(result.mimeType).toBe("text/plain")
    expect(result.size).toBe(content.length)
    expect(result.sizeFormatted).toBe("13.00 B")
    expect(result.permissions.readable).toBe(true)
    expect(result.permissions.writable).toBe(true)
  })

  it("gets info for existing directory", async () => {
    await fs.mkdir(testDir)
    const result = await getFileInfo({ path: testDir })
    expect(result.exists).toBe(true)
    expect(result.name).toBe(testDir)
    expect(result.extension).toBe(null)
    expect(result.type).toBe("directory")
    expect(result.mimeType).toBe(null)
    expect(result.permissions.readable).toBe(true)
  })

  it("throws error if file does not exist", async () => {
    await expect(getFileInfo({ path: "nonexistent.txt" })).rejects.toThrow("does not exist")
  })

  it("detects read-only files", async () => {
    await fs.writeFile(testFile, "readonly content")
    await fs.chmod(testFile, 0o444)
    const result = await getFileInfo({ path: testFile })
    expect(result.permissions.readable).toBe(true)
    expect(result.permissions.writable).toBe(false)
    await fs.chmod(testFile, 0o644)
  })

  it("formats large file sizes correctly", async () => {
    const largeContent = "x".repeat(1024 * 1024)
    await fs.writeFile(testFile, largeContent)
    const result = await getFileInfo({ path: testFile })
    expect(result.size).toBe(1024 * 1024)
    expect(result.sizeFormatted).toBe("1.00 MB")
  })
})
