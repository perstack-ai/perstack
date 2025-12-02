import fs from "node:fs/promises"
import { afterEach, describe, expect, it, vi } from "vitest"
import { readTextFile } from "./read-text-file.js"

const testFile = "read-text-file.test.txt"
vi.mock("../lib/path.js", () => ({
  workspacePath: "/workspace",
  validatePath: vi.fn(),
}))
const mockPath = vi.mocked(await import("../lib/path.js"))

describe("readTextFile tool", () => {
  afterEach(async () => {
    await fs.rm(testFile, { force: true })
    vi.clearAllMocks()
  })

  describe("text reading", () => {
    it("reads entire file successfully", async () => {
      const content = "Line 1\nLine 2\nLine 3"
      await fs.writeFile(testFile, content, "utf-8")
      mockPath.validatePath.mockResolvedValue(testFile)
      const result = await readTextFile({ path: testFile })
      expect(result).toEqual({
        path: testFile,
        content,
        from: 0,
        to: 3,
      })
      expect(mockPath.validatePath).toHaveBeenCalledWith(testFile)
    })

    it("reads file with line range", async () => {
      const content = "Line 1\nLine 2\nLine 3\nLine 4\nLine 5"
      await fs.writeFile(testFile, content, "utf-8")
      mockPath.validatePath.mockResolvedValue(testFile)
      const result = await readTextFile({ path: testFile, from: 1, to: 3 })
      expect(result).toEqual({
        path: testFile,
        content: "Line 2\nLine 3",
        from: 1,
        to: 3,
      })
    })

    it("reads from specific line to end", async () => {
      const content = "Line 1\nLine 2\nLine 3"
      await fs.writeFile(testFile, content, "utf-8")
      mockPath.validatePath.mockResolvedValue(testFile)
      const result = await readTextFile({ path: testFile, from: 2 })
      expect(result).toEqual({
        path: testFile,
        content: "Line 3",
        from: 2,
        to: 3,
      })
    })

    it("reads from beginning to specific line", async () => {
      const content = "Line 1\nLine 2\nLine 3\nLine 4"
      await fs.writeFile(testFile, content, "utf-8")
      mockPath.validatePath.mockResolvedValue(testFile)
      const result = await readTextFile({ path: testFile, to: 2 })
      expect(result).toEqual({
        path: testFile,
        content: "Line 1\nLine 2",
        from: 0,
        to: 2,
      })
    })

    it("handles empty file", async () => {
      await fs.writeFile(testFile, "", "utf-8")
      mockPath.validatePath.mockResolvedValue(testFile)
      const result = await readTextFile({ path: testFile })
      expect(result).toEqual({
        path: testFile,
        content: "",
        from: 0,
        to: 1,
      })
    })

    it("handles Unicode content", async () => {
      const content = "🦜 Perstack\n日本語テスト"
      await fs.writeFile(testFile, content, "utf-8")
      mockPath.validatePath.mockResolvedValue(testFile)
      const result = await readTextFile({ path: testFile })
      expect(result.content).toBe(content)
    })

    it("throws error if file does not exist", async () => {
      mockPath.validatePath.mockResolvedValue("nonexistent.txt")
      await expect(readTextFile({ path: "nonexistent.txt" })).rejects.toThrow("does not exist")
    })

    it("throws error if path validation fails", async () => {
      mockPath.validatePath.mockRejectedValue(new Error("Access denied"))
      await expect(readTextFile({ path: "../invalid" })).rejects.toThrow("Access denied")
    })
  })
})
