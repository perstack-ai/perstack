import fs from "node:fs/promises"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { appendTextFile } from "./append-text-file.js"

const testFile = "append-text-file.test.txt"
vi.mock("../lib/path.js", () => ({
  workspacePath: "/workspace",
  validatePath: vi.fn(),
}))

const mockPath = vi.mocked(await import("../lib/path.js"))

describe("appendTextFile tool", () => {
  beforeEach(async () => {
    await fs.writeFile(testFile, "initial content")
  })

  afterEach(async () => {
    await fs.rm(testFile, { force: true })
    vi.clearAllMocks()
  })

  it("appends text to existing file", async () => {
    const appendText = "\nappended content"
    mockPath.validatePath.mockResolvedValue(testFile)
    const result = await appendTextFile({ path: testFile, text: appendText })
    expect(await fs.readFile(testFile, "utf-8")).toBe("initial content\nappended content")
    expect(result).toStrictEqual({ path: testFile, text: appendText })
  })

  it("appends multiple times", async () => {
    mockPath.validatePath.mockResolvedValue(testFile)
    await appendTextFile({ path: testFile, text: "\nfirst append" })
    await appendTextFile({ path: testFile, text: "\nsecond append" })
    const content = await fs.readFile(testFile, "utf-8")
    expect(content).toBe("initial content\nfirst append\nsecond append")
  })

  it("throws error if file does not exist", async () => {
    const nonExistentFile = "non-existent.txt"
    mockPath.validatePath.mockResolvedValue(nonExistentFile)
    await expect(appendTextFile({ path: nonExistentFile, text: "content" })).rejects.toThrow(
      "does not exist",
    )
  })

  it("throws error if file is not writable", async () => {
    await fs.chmod(testFile, 0o444)
    mockPath.validatePath.mockResolvedValue(testFile)
    await expect(appendTextFile({ path: testFile, text: "new content" })).rejects.toThrow(
      "not writable",
    )
    await fs.chmod(testFile, 0o644)
  })

  it("handles empty append text", async () => {
    mockPath.validatePath.mockResolvedValue(testFile)
    const result = await appendTextFile({ path: testFile, text: "" })
    expect(await fs.readFile(testFile, "utf-8")).toBe("initial content")
    expect(result).toStrictEqual({ path: testFile, text: "" })
  })
})
