import type { McpStdioSkill } from "@perstack/core"
import { describe, expect, it } from "vitest"
import { getCommandArgs } from "./command-args.js"

function createSkill(overrides: Partial<McpStdioSkill> = {}): McpStdioSkill {
  return {
    type: "mcpStdioSkill",
    name: "test-skill",
    command: "npx",
    requiredEnv: [],
    pick: [],
    omit: [],
    ...overrides,
  } as McpStdioSkill
}

describe("@perstack/runtime: getCommandArgs", () => {
  describe("packageName handling", () => {
    it("uses packageName when provided", () => {
      const skill = createSkill({ packageName: "@example/pkg" })
      const result = getCommandArgs(skill)
      expect(result.args).toContain("@example/pkg")
    })

    it("adds -y flag for npx with packageName", () => {
      const skill = createSkill({ packageName: "@example/pkg" })
      const result = getCommandArgs(skill)
      expect(result.args).toEqual(["-y", "@example/pkg"])
    })
  })

  describe("args handling", () => {
    it("uses args when provided", () => {
      const skill = createSkill({ args: ["--config", "test.json"] })
      const result = getCommandArgs(skill)
      expect(result.args).toContain("--config")
      expect(result.args).toContain("test.json")
    })

    it("adds -y flag for npx with args", () => {
      const skill = createSkill({ args: ["@example/pkg"] })
      const result = getCommandArgs(skill)
      expect(result.args[0]).toBe("-y")
    })

    it("does not duplicate -y flag if already present", () => {
      const skill = createSkill({ args: ["-y", "@example/pkg"] })
      const result = getCommandArgs(skill)
      expect(result.args.filter((a) => a === "-y")).toHaveLength(1)
    })
  })

  describe("non-npx commands", () => {
    it("does not add -y flag for non-npx commands", () => {
      const skill = createSkill({ command: "node", args: ["script.js"] })
      const result = getCommandArgs(skill)
      expect(result.args).not.toContain("-y")
      expect(result.args).toEqual(["script.js"])
    })

    it("returns correct command", () => {
      const skill = createSkill({ command: "python", args: ["script.py"] })
      const result = getCommandArgs(skill)
      expect(result.command).toBe("python")
    })
  })

  describe("error cases", () => {
    it("throws when neither packageName nor args provided", () => {
      const skill = createSkill({ packageName: undefined, args: undefined })
      expect(() => getCommandArgs(skill)).toThrow(
        "Skill test-skill has no packageName or args. Please provide one of them.",
      )
    })

    it("throws when both packageName and args provided", () => {
      const skill = createSkill({ packageName: "@example/pkg", args: ["extra"] })
      expect(() => getCommandArgs(skill)).toThrow(
        "Skill test-skill has both packageName and args. Please provide only one of them.",
      )
    })

    it("throws when args is empty array and no packageName", () => {
      const skill = createSkill({ packageName: undefined, args: [] })
      expect(() => getCommandArgs(skill)).toThrow(
        "Skill test-skill has no packageName or args. Please provide one of them.",
      )
    })
  })
})
