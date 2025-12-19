import { existsSync } from "node:fs"
import fs from "node:fs/promises"
import { join } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import { writeTextFile } from "./write-text-file.js"

const testFile = "write-text-file.test.txt"
vi.mock("../lib/path.js", () => ({
  workspacePath: "/workspace",
  validatePath: vi.fn(),
}))
const mockPath = vi.mocked(await import("../lib/path.js"))
describe("writeTextFile tool", () => {
  afterEach(async () => {
    await fs.rm(testFile, { force: true })
    await fs.rm("nested", { recursive: true, force: true })
    vi.clearAllMocks()
  })

  it("creates new file with content", async () => {
    const content = "Hello, World!"
    mockPath.validatePath.mockResolvedValue(testFile)
    const result = await writeTextFile({ path: testFile, text: content })
    expect(existsSync(testFile)).toBe(true)
    expect(await fs.readFile(testFile, "utf-8")).toBe(content)
    expect(result).toEqual({ path: testFile, text: content })
  })

  it("overwrites existing file", async () => {
    await fs.writeFile(testFile, "original content")
    const newContent = "new content"
    mockPath.validatePath.mockResolvedValue(testFile)
    const result = await writeTextFile({ path: testFile, text: newContent })
    expect(await fs.readFile(testFile, "utf-8")).toBe(newContent)
    expect(result).toEqual({ path: testFile, text: newContent })
  })

  it("creates parent directories automatically", async () => {
    const nestedFile = join("nested", "deep", testFile)
    const content = "nested content"
    mockPath.validatePath.mockResolvedValue(nestedFile)
    const result = await writeTextFile({ path: nestedFile, text: content })
    expect(existsSync(nestedFile)).toBe(true)
    expect(existsSync("nested/deep")).toBe(true)
    expect(await fs.readFile(nestedFile, "utf-8")).toBe(content)
    expect(result).toEqual({ path: nestedFile, text: content })
  })

  it("handles empty content", async () => {
    mockPath.validatePath.mockResolvedValue(testFile)
    const result = await writeTextFile({ path: testFile, text: "" })
    expect(existsSync(testFile)).toBe(true)
    expect(await fs.readFile(testFile, "utf-8")).toBe("")
    expect(result).toEqual({ path: testFile, text: "" })
  })

  it("throws error if existing file is not writable", async () => {
    await fs.writeFile(testFile, "readonly content")
    await fs.chmod(testFile, 0o444)
    mockPath.validatePath.mockResolvedValue(testFile)
    await expect(writeTextFile({ path: testFile, text: "new content" })).rejects.toThrow(
      "not writable",
    )
    await fs.chmod(testFile, 0o644)
  })
})
