import fs from "node:fs/promises"
import { afterEach, describe, expect, it } from "vitest"
import {
  isSymlinkProtectionFullySupported,
  safeAppendFile,
  safeReadFile,
  safeWriteFile,
} from "./safe-file.js"

const testFile = "safe-file.test.txt"
const testSymlink = "safe-file.test.link"

describe("safe-file", () => {
  afterEach(async () => {
    await fs.rm(testFile, { force: true })
    await fs.rm(testSymlink, { force: true })
  })

  describe("safeWriteFile", () => {
    it("writes content to new file", async () => {
      await safeWriteFile(testFile, "hello world")
      const content = await fs.readFile(testFile, "utf-8")
      expect(content).toBe("hello world")
    })

    it("overwrites existing file", async () => {
      await fs.writeFile(testFile, "original")
      await safeWriteFile(testFile, "new content")
      const content = await fs.readFile(testFile, "utf-8")
      expect(content).toBe("new content")
    })

    it("rejects symbolic links", async () => {
      await fs.writeFile(testFile, "content")
      try {
        await fs.symlink(testFile, testSymlink)
        await expect(safeWriteFile(testSymlink, "malicious")).rejects.toThrow("symbolic link")
      } catch (error) {
        const err = error as { code?: string }
        if (err.code === "EPERM" || err.code === "ENOTSUP") {
          return
        }
        throw error
      }
    })
  })

  describe("safeReadFile", () => {
    it("reads content from file", async () => {
      await fs.writeFile(testFile, "hello world")
      const content = await safeReadFile(testFile)
      expect(content).toBe("hello world")
    })

    it("rejects symbolic links", async () => {
      await fs.writeFile(testFile, "content")
      try {
        await fs.symlink(testFile, testSymlink)
        await expect(safeReadFile(testSymlink)).rejects.toThrow("symbolic link")
      } catch (error) {
        const err = error as { code?: string }
        if (err.code === "EPERM" || err.code === "ENOTSUP") {
          return
        }
        throw error
      }
    })
  })

  describe("safeAppendFile", () => {
    it("appends content to file", async () => {
      await fs.writeFile(testFile, "hello")
      await safeAppendFile(testFile, " world")
      const content = await fs.readFile(testFile, "utf-8")
      expect(content).toBe("hello world")
    })

    it("rejects symbolic links", async () => {
      await fs.writeFile(testFile, "content")
      try {
        await fs.symlink(testFile, testSymlink)
        await expect(safeAppendFile(testSymlink, "malicious")).rejects.toThrow("symbolic link")
      } catch (error) {
        const err = error as { code?: string }
        if (err.code === "EPERM" || err.code === "ENOTSUP") {
          return
        }
        throw error
      }
    })
  })

  describe("isSymlinkProtectionFullySupported", () => {
    it("returns boolean indicating O_NOFOLLOW support", () => {
      const result = isSymlinkProtectionFullySupported()
      expect(typeof result).toBe("boolean")
    })
  })
})
