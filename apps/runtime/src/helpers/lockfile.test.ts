import type { LockfileExpert, LockfileToolDefinition } from "@perstack/core"
import { describe, expect, it } from "vitest"
import { getLockfileExpertToolDefinitions } from "./lockfile.js"

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
})
