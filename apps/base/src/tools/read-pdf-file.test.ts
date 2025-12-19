import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, describe, expect, it, vi } from "vitest"
import { readPdfFile } from "./read-pdf-file.js"

const __dirname = fileURLToPath(new URL(".", import.meta.url))
const fixturesDir = join(__dirname, "../../test/fixtures")
const testPdf = join(fixturesDir, "the-illusion-of-thinking.pdf")
const largePdf = join(fixturesDir, "test-large-32MB.pdf")
const testImage = join(fixturesDir, "super_parrot.png")

vi.mock("../lib/path.js", () => ({
  workspacePath: "/workspace",
  validatePath: vi.fn(),
}))
const mockPath = vi.mocked(await import("../lib/path.js"))

describe("readPdfFile tool", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("PDF reading", () => {
    it("validates PDF file successfully", async () => {
      mockPath.validatePath.mockResolvedValue(testPdf)
      const result = await readPdfFile({ path: testPdf })
      expect(result).toEqual({
        path: testPdf,
        mimeType: "application/pdf",
        size: expect.any(Number),
      })
      expect(mockPath.validatePath).toHaveBeenCalledWith(testPdf)
    })

    it("rejects files larger than 30MB", async () => {
      mockPath.validatePath.mockResolvedValue(largePdf)
      await expect(readPdfFile({ path: largePdf })).rejects.toThrow("PDF file too large")
      await expect(readPdfFile({ path: largePdf })).rejects.toThrow(
        "Maximum supported size is 30MB",
      )
    })

    it("throws error if file does not exist", async () => {
      mockPath.validatePath.mockResolvedValue("nonexistent.pdf")
      await expect(readPdfFile({ path: "nonexistent.pdf" })).rejects.toThrow("does not exist")
    })

    it("throws error if file is not PDF", async () => {
      mockPath.validatePath.mockResolvedValue(testImage)
      await expect(readPdfFile({ path: testImage })).rejects.toThrow("is not a PDF file")
    })

    it("throws error if path validation fails", async () => {
      mockPath.validatePath.mockRejectedValue(new Error("Access denied"))
      await expect(readPdfFile({ path: "../invalid" })).rejects.toThrow("Access denied")
    })
  })
})
