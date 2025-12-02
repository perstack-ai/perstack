import fs from "node:fs/promises"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { validatePath } from "./path.js"

const testFile = "path.test.txt"
const testDir = "testdir"

describe("validatePath", () => {
  let originalCwd: string

  beforeEach(() => {
    originalCwd = process.cwd()
  })

  afterEach(async () => {
    process.chdir(originalCwd)
    await fs.rm(testFile, { force: true })
    await fs.rm(testDir, { recursive: true, force: true })
    await fs.rm("link.txt", { force: true })
    vi.unstubAllEnvs()
  })

  describe("valid paths", () => {
    it("validates absolute path within workspace", async () => {
      await fs.writeFile(testFile, "content")
      const absolutePath = join(process.cwd(), testFile)
      const result = await validatePath(absolutePath)
      expect(result).toBe(await fs.realpath(absolutePath))
    })

    it("validates relative path within workspace", async () => {
      await fs.writeFile(testFile, "content")
      const result = await validatePath(testFile)
      expect(result).toBe(await fs.realpath(join(process.cwd(), testFile)))
    })

    it("validates nested path within workspace", async () => {
      await fs.mkdir(testDir, { recursive: true })
      await fs.writeFile(join(testDir, testFile), "content")
      const result = await validatePath(join(testDir, testFile))
      expect(result).toBe(await fs.realpath(join(process.cwd(), testDir, testFile)))
    })

    it("handles non-existent file in valid directory", async () => {
      const newFile = "new-file.txt"
      const result = await validatePath(newFile)
      expect(result).toBe(join(process.cwd(), newFile))
    })

    it("expands ~ to home directory", async () => {
      vi.stubEnv("HOME", process.cwd())
      await fs.writeFile(testFile, "content")
      const result = await validatePath(`~/${testFile}`)
      expect(result).toBe(await fs.realpath(join(process.cwd(), testFile)))
    })

    it("validates symlink within workspace", async () => {
      await fs.writeFile(testFile, "content")
      try {
        await fs.symlink(testFile, "link.txt")
        const result = await validatePath("link.txt")
        expect(result).toBe(await fs.realpath(testFile))
      } catch (error) {
        const err = error as { code?: string }
        if (err.code === "EPERM" || err.code === "ENOTSUP") {
          return // Skip on systems that don't support symlinks
        }
        throw error
      }
    })
  })

  describe("security", () => {
    it("rejects absolute path outside workspace", async () => {
      await expect(validatePath("/etc/passwd")).rejects.toThrow(
        "Access denied - path outside allowed directories",
      )
    })

    it("rejects relative path escaping workspace", async () => {
      await expect(validatePath("../../../etc/passwd")).rejects.toThrow(
        "Access denied - path outside allowed directories",
      )
    })
  })

  describe("error handling", () => {
    it("throws error for non-existent parent directory", async () => {
      await expect(validatePath("nonexistent/dir/file.txt")).rejects.toThrow(
        "Parent directory does not exist",
      )
    })

    it("handles empty string as current directory", async () => {
      const result = await validatePath("")
      expect(result).toBe(await fs.realpath(process.cwd()))
    })

    it("handles . as current directory", async () => {
      const result = await validatePath(".")
      expect(result).toBe(await fs.realpath(process.cwd()))
    })
  })
})
