import fs from "node:fs/promises"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { listDirectory } from "./list-directory.js"

const testDir = "list-directory-test"
describe("listDirectory tool", () => {
  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true })
    await fs.rm("file.txt", { force: true })
  })

  it("lists files and directories in test directory", async () => {
    await fs.mkdir(testDir)
    await fs.writeFile(join(testDir, "file1.txt"), "content1")
    await fs.writeFile(join(testDir, "file2.txt"), "content2")
    await fs.mkdir(join(testDir, "subdir"))
    const items = await listDirectory({ path: testDir })
    expect(items.items).toHaveLength(3)
    const names = items.items.map((item) => item.name).sort()
    expect(names).toEqual(["file1.txt", "file2.txt", "subdir"])
    const file1 = items.items.find((item) => item.name === "file1.txt")!
    expect(file1.type).toBe("file")
    expect(file1.size).toBe(8)
    const subdir = items.items.find((item) => item.name === "subdir")!
    expect(subdir.type).toBe("directory")
  })

  it("lists specific directory contents", async () => {
    await fs.mkdir(testDir)
    await fs.writeFile(join(testDir, "nested.txt"), "nested content")
    const items = await listDirectory({ path: testDir })
    expect(items.items).toHaveLength(1)
    expect(items.items[0].name).toBe("nested.txt")
    expect(items.items[0].type).toBe("file")
  })

  it("handles empty directory", async () => {
    await fs.mkdir(testDir)
    const items = await listDirectory({ path: testDir })
    expect(items.items).toHaveLength(0)
  })

  it("throws error if directory does not exist", async () => {
    await expect(listDirectory({ path: "nonexistent" })).rejects.toThrow("does not exist")
  })

  it("throws error if path is not a directory", async () => {
    await fs.writeFile("file.txt", "content")
    await expect(listDirectory({ path: "file.txt" })).rejects.toThrow("is not a directory")
    await fs.rm("file.txt")
  })
})
