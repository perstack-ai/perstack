import fs from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, describe, expect, it, vi } from "vitest"
import { readImageFile } from "./read-image-file.js"

const __dirname = fileURLToPath(new URL(".", import.meta.url))
const fixturesDir = join(__dirname, "../../test/fixtures")
const testPng = join(fixturesDir, "super_parrot.png")
const testJpeg = join(fixturesDir, "super_parrot.jpeg")
const testPdf = join(fixturesDir, "the-illusion-of-thinking.pdf")
const testImage = "test.png"
const largeImage = "large.png"

vi.mock("../lib/path.js", () => ({
  workspacePath: "/workspace",
  validatePath: vi.fn(),
}))
const mockPath = vi.mocked(await import("../lib/path.js"))

describe("readImageFile tool", () => {
  afterEach(async () => {
    await fs.rm(testImage, { force: true })
    await fs.rm(largeImage, { force: true })
    await fs.rm("test.gif", { force: true })
    await fs.rm("test.webp", { force: true })
    await fs.rm("test.txt", { force: true })
    vi.clearAllMocks()
  })

  describe("image reading", () => {
    it("validates PNG file successfully", async () => {
      mockPath.validatePath.mockResolvedValue(testPng)
      const result = await readImageFile({ path: testPng })
      expect(result).toEqual({
        path: testPng,
        mimeType: "image/png",
        size: expect.any(Number),
      })
      expect(mockPath.validatePath).toHaveBeenCalledWith(testPng)
    })

    it("validates JPEG file successfully", async () => {
      mockPath.validatePath.mockResolvedValue(testJpeg)
      const result = await readImageFile({ path: testJpeg })
      expect(result).toEqual({
        path: testJpeg,
        mimeType: "image/jpeg",
        size: expect.any(Number),
      })
      expect(mockPath.validatePath).toHaveBeenCalledWith(testJpeg)
    })

    it("validates GIF file successfully", async () => {
      await fs.writeFile("test.gif", Buffer.from([0x47, 0x49, 0x46]))
      mockPath.validatePath.mockResolvedValue("test.gif")
      const result = await readImageFile({ path: "test.gif" })
      expect(result).toEqual({
        path: "test.gif",
        mimeType: "image/gif",
        size: expect.any(Number),
      })
    })

    it("validates WebP file successfully", async () => {
      await fs.writeFile("test.webp", Buffer.from([0x52, 0x49, 0x46, 0x46]))
      mockPath.validatePath.mockResolvedValue("test.webp")
      const result = await readImageFile({ path: "test.webp" })
      expect(result).toEqual({
        path: "test.webp",
        mimeType: "image/webp",
        size: expect.any(Number),
      })
    })

    it("rejects files larger than 15MB", async () => {
      const largeContent = Buffer.alloc(16 * 1024 * 1024) // 16MB
      await fs.writeFile(largeImage, largeContent)
      mockPath.validatePath.mockResolvedValue(largeImage)
      await expect(readImageFile({ path: largeImage })).rejects.toThrow(
        "Image file too large (16.0MB)",
      )
      await expect(readImageFile({ path: largeImage })).rejects.toThrow(
        "Maximum supported size is 15MB",
      )
    })

    it("throws error if file does not exist", async () => {
      mockPath.validatePath.mockResolvedValue("nonexistent.png")
      await expect(readImageFile({ path: "nonexistent.png" })).rejects.toThrow("does not exist")
    })

    it("throws error if file is not supported format", async () => {
      await fs.writeFile("test.txt", "not an image")
      mockPath.validatePath.mockResolvedValue("test.txt")
      await expect(readImageFile({ path: "test.txt" })).rejects.toThrow("is not supported")
    })

    it("throws error if file is not an image", async () => {
      mockPath.validatePath.mockResolvedValue(testPdf)
      await expect(readImageFile({ path: testPdf })).rejects.toThrow("is not supported")
    })

    it("throws error if path validation fails", async () => {
      mockPath.validatePath.mockRejectedValue(new Error("Access denied"))
      await expect(readImageFile({ path: "../invalid" })).rejects.toThrow("Access denied")
    })
  })
})
