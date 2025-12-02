import fs from "node:fs/promises"
import { afterEach, describe, expect, it, vi } from "vitest"
import { validatePath } from "../lib/path.js"
import { editTextFile } from "./edit-text-file.js"

const testFile = "edit-text-file.test.txt"
describe("editTextFile tool", () => {
  afterEach(async () => {
    await fs.rm(testFile, { force: true })
    vi.clearAllMocks()
  })

  it("replaces text in existing file successfully", async () => {
    await fs.writeFile(testFile, "Hello, World!")
    const result = await editTextFile({
      path: testFile,
      newText: "Universe",
      oldText: "World",
    })
    expect(await fs.readFile(testFile, "utf-8")).toBe("Hello, Universe!")
    expect(result).toStrictEqual({
      path: await validatePath(testFile),
      newText: "Universe",
      oldText: "World",
    })
  })

  it("replaces multiline text in existing file successfully", async () => {
    const originalContent = "Line 1\nLine 2\nLine 3"
    await fs.writeFile(testFile, originalContent)
    await editTextFile({ path: testFile, newText: "Modified Line 2", oldText: "Line 2" })
    expect(await fs.readFile(testFile, "utf-8")).toBe("Line 1\nModified Line 2\nLine 3")
  })

  it("throws error if file does not exist", async () => {
    await expect(
      editTextFile({ path: "nonexistent.txt", newText: "old", oldText: "new" }),
    ).rejects.toThrow("does not exist")
  })

  it("throws error if file is not writable", async () => {
    await fs.writeFile(testFile, "readonly content")
    await fs.chmod(testFile, 0o444)
    await expect(
      editTextFile({ path: testFile, newText: "updated", oldText: "content" }),
    ).rejects.toThrow("not writable")
    await fs.chmod(testFile, 0o644)
  })

  it("throws error if text not found in file", async () => {
    await fs.writeFile(testFile, "This is the content")
    await expect(
      editTextFile({ path: testFile, newText: "new", oldText: "nonexistent" }),
    ).rejects.toThrow("Could not find exact match")
  })
})
