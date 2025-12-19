import { existsSync } from "node:fs"
import fs from "node:fs/promises"
import { join } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import { moveFile } from "./move-file.js"

const sourceFile = "move-file-source.txt"
const destFile = "move-file-destination.txt"
vi.mock("../lib/path.js", () => ({
  workspacePath: "/workspace",
  validatePath: vi.fn(),
}))
const mockPath = vi.mocked(await import("../lib/path.js"))
describe("moveFile tool", () => {
  afterEach(async () => {
    await fs.rm(sourceFile, { force: true })
    await fs.rm(destFile, { force: true })
    await fs.rm("subdir", { recursive: true, force: true })
    await fs.rm("newdir", { recursive: true, force: true })
    vi.clearAllMocks()
  })

  it("moves file to new location successfully", async () => {
    await fs.writeFile(sourceFile, "test content")
    mockPath.validatePath.mockResolvedValueOnce(sourceFile).mockResolvedValueOnce(destFile)
    const result = await moveFile({ source: sourceFile, destination: destFile })
    expect(existsSync(sourceFile)).toBe(false)
    expect(existsSync(destFile)).toBe(true)
    expect(await fs.readFile(destFile, "utf-8")).toBe("test content")
    expect(result).toStrictEqual({ source: sourceFile, destination: destFile })
  })

  it("moves file to different directory", async () => {
    await fs.writeFile(sourceFile, "test content")
    await fs.mkdir("subdir")
    const destPath = join("subdir", destFile)
    mockPath.validatePath.mockResolvedValueOnce(sourceFile).mockResolvedValueOnce(destPath)
    const result = await moveFile({ source: sourceFile, destination: destPath })
    expect(existsSync(sourceFile)).toBe(false)
    expect(existsSync(destPath)).toBe(true)
    expect(result).toStrictEqual({ source: sourceFile, destination: destPath })
  })

  it("creates destination directory if needed", async () => {
    await fs.writeFile(sourceFile, "test content")
    const destPath = join("newdir", destFile)
    mockPath.validatePath.mockResolvedValueOnce(sourceFile).mockResolvedValueOnce(destPath)
    const result = await moveFile({ source: sourceFile, destination: destPath })
    expect(existsSync(sourceFile)).toBe(false)
    expect(existsSync(destPath)).toBe(true)
    expect(existsSync("newdir")).toBe(true)
    expect(result).toStrictEqual({ source: sourceFile, destination: destPath })
  })

  it("throws error if source does not exist", async () => {
    mockPath.validatePath.mockResolvedValueOnce("nonexistent.txt").mockResolvedValueOnce(destFile)
    await expect(moveFile({ source: "nonexistent.txt", destination: destFile })).rejects.toThrow(
      "does not exist",
    )
  })

  it("throws error if destination already exists", async () => {
    await fs.writeFile(sourceFile, "source content")
    await fs.writeFile(destFile, "existing content")
    mockPath.validatePath.mockResolvedValueOnce(sourceFile).mockResolvedValueOnce(destFile)
    await expect(moveFile({ source: sourceFile, destination: destFile })).rejects.toThrow(
      "already exists",
    )
  })

  it("throws error if source is not writable", async () => {
    await fs.writeFile(sourceFile, "readonly content")
    await fs.chmod(sourceFile, 0o444)
    mockPath.validatePath.mockResolvedValueOnce(sourceFile).mockResolvedValueOnce(destFile)
    await expect(moveFile({ source: sourceFile, destination: destFile })).rejects.toThrow(
      "not writable",
    )
    await fs.chmod(sourceFile, 0o644)
  })
})
