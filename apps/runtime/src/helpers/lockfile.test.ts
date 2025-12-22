import fs from "node:fs"
import path from "node:path"
import type { LockfileExpert, LockfileToolDefinition } from "@perstack/core"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { findLockfile, getLockfileExpertToolDefinitions, loadLockfile } from "./lockfile.js"

const createLockfileExpert = (
  toolDefinitions: LockfileToolDefinition[],
  overrides: Partial<LockfileExpert> = {},
): LockfileExpert => ({
  key: "test-expert",
  name: "Test Expert",
  version: "1.0.0",
  instruction: "Test instruction",
  skills: {},
  delegates: [],
  tags: [],
  toolDefinitions,
  ...overrides,
})

describe("lockfile", () => {
  describe("getLockfileExpertToolDefinitions", () => {
    it("groups tool definitions by skill name", () => {
      const lockfileExpert = createLockfileExpert([
        {
          skillName: "@perstack/base",
          name: "readFile",
          description: "Read a file",
          inputSchema: { type: "object", properties: { path: { type: "string" } } },
        },
        {
          skillName: "@perstack/base",
          name: "writeFile",
          description: "Write a file",
          inputSchema: { type: "object", properties: { path: { type: "string" } } },
        },
        {
          skillName: "other-skill",
          name: "otherTool",
          description: "Other tool",
          inputSchema: { type: "object" },
        },
      ])

      const result = getLockfileExpertToolDefinitions(lockfileExpert)

      expect(result["@perstack/base"]).toHaveLength(2)
      expect(result["other-skill"]).toHaveLength(1)
      expect(result["@perstack/base"][0].name).toBe("readFile")
      expect(result["@perstack/base"][1].name).toBe("writeFile")
      expect(result["other-skill"][0].name).toBe("otherTool")
    })

    it("returns empty object for expert with no tool definitions", () => {
      const lockfileExpert = createLockfileExpert([], { key: "empty-expert", name: "Empty Expert" })

      const result = getLockfileExpertToolDefinitions(lockfileExpert)

      expect(Object.keys(result)).toHaveLength(0)
    })

    it("preserves tool definition properties", () => {
      const lockfileExpert = createLockfileExpert([
        {
          skillName: "test-skill",
          name: "testTool",
          description: "A test tool",
          inputSchema: {
            type: "object",
            properties: { param: { type: "string" } },
            required: ["param"],
          },
        },
      ])

      const result = getLockfileExpertToolDefinitions(lockfileExpert)

      expect(result["test-skill"][0]).toEqual({
        skillName: "test-skill",
        name: "testTool",
        description: "A test tool",
        inputSchema: {
          type: "object",
          properties: { param: { type: "string" } },
          required: ["param"],
        },
      })
    })
  })

  describe("loadLockfile", () => {
    const testDir = path.join(process.cwd(), ".test-lockfile-temp")
    const testLockfilePath = path.join(testDir, "perstack.lock")

    beforeEach(() => {
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true })
      }
    })

    afterEach(() => {
      vi.restoreAllMocks()
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true })
      }
    })

    it("returns parsed lockfile for valid TOML", () => {
      const validToml = `
version = "1"
generatedAt = 1704067200000
configPath = "perstack.toml"

[experts.test-expert]
key = "test-expert"
name = "Test Expert"
version = "1.0.0"
instruction = "Test"
delegates = []
tags = []
toolDefinitions = []

[experts.test-expert.skills]
`
      fs.writeFileSync(testLockfilePath, validToml)

      const result = loadLockfile(testLockfilePath)

      expect(result).not.toBeNull()
      expect(result?.version).toBe("1")
      expect(result?.configPath).toBe("perstack.toml")
      expect(Object.keys(result?.experts ?? {})).toHaveLength(1)
    })

    it("returns null for invalid TOML", () => {
      fs.writeFileSync(testLockfilePath, "invalid { toml content")

      const result = loadLockfile(testLockfilePath)

      expect(result).toBeNull()
    })

    it("returns null for non-existent file", () => {
      const result = loadLockfile("/non/existent/path/perstack.lock")

      expect(result).toBeNull()
    })

    it("returns null for TOML that doesn't match schema", () => {
      fs.writeFileSync(testLockfilePath, "[invalid]\nkey = 'value'")

      const result = loadLockfile(testLockfilePath)

      expect(result).toBeNull()
    })
  })

  describe("findLockfile", () => {
    const originalCwd = process.cwd()
    const testDir = path.join(originalCwd, ".test-find-lockfile-temp")
    const nestedDir = path.join(testDir, "nested", "deep")

    beforeEach(() => {
      if (!fs.existsSync(nestedDir)) {
        fs.mkdirSync(nestedDir, { recursive: true })
      }
    })

    afterEach(() => {
      vi.restoreAllMocks()
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true })
      }
    })

    it("returns lockfile path based on config path when provided", () => {
      const configPath = path.join(testDir, "perstack.toml")

      const result = findLockfile(configPath)

      expect(result).toBe(path.join(testDir, "perstack.lock"))
    })

    it("returns lockfile path from config path even if file does not exist", () => {
      // findLockfile with configPath always returns the path, doesn't check existence
      const configPath = path.join("/some/nonexistent", "perstack.toml")

      const result = findLockfile(configPath)

      expect(result).toBe(path.join("/some/nonexistent", "perstack.lock"))
    })

    it("returns null for remote config URLs (https://)", () => {
      const configPath = "https://raw.githubusercontent.com/org/repo/main/perstack.toml"

      const result = findLockfile(configPath)

      expect(result).toBeNull()
    })

    it("returns null for remote config URLs (http://)", () => {
      const configPath = "http://example.com/perstack.toml"

      const result = findLockfile(configPath)

      expect(result).toBeNull()
    })

    it("returns null for remote config URLs with uppercase scheme (HTTPS://)", () => {
      const configPath = "HTTPS://example.com/perstack.toml"

      const result = findLockfile(configPath)

      expect(result).toBeNull()
    })

    it("returns null for remote config URLs with mixed case scheme (HtTpS://)", () => {
      const configPath = "HtTpS://raw.githubusercontent.com/org/repo/main/perstack.toml"

      const result = findLockfile(configPath)

      expect(result).toBeNull()
    })

    it("finds lockfile recursively from nested directory", () => {
      // Create lockfile in parent directory
      const lockfilePath = path.join(testDir, "perstack.lock")
      fs.writeFileSync(lockfilePath, "")
      vi.spyOn(process, "cwd").mockReturnValue(nestedDir)

      const result = findLockfile()

      expect(result).toBe(lockfilePath)
    })

    it("finds lockfile in current directory", () => {
      const lockfilePath = path.join(testDir, "perstack.lock")
      fs.writeFileSync(lockfilePath, "")
      vi.spyOn(process, "cwd").mockReturnValue(testDir)

      const result = findLockfile()

      expect(result).toBe(lockfilePath)
    })
  })
})
