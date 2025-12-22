import type { McpSseSkill, McpStdioSkill } from "@perstack/core"
import { describe, expect, it } from "vitest"
import { hasExplicitBaseVersion, isBaseSkill, shouldUseBundledBase } from "./helpers.js"

describe("skill-manager helpers", () => {
  describe("hasExplicitBaseVersion", () => {
    it("returns true for packageName with version", () => {
      const skill: McpStdioSkill = {
        name: "@perstack/base",
        type: "mcpStdioSkill",
        command: "npx",
        packageName: "@perstack/base@0.0.34",
        requiredEnv: [],
      }
      expect(hasExplicitBaseVersion(skill)).toBe(true)
    })

    it("returns true for args with version", () => {
      const skill: McpStdioSkill = {
        name: "@perstack/base",
        type: "mcpStdioSkill",
        command: "npx",
        args: ["@perstack/base@1.2.3"],
        requiredEnv: [],
      }
      expect(hasExplicitBaseVersion(skill)).toBe(true)
    })

    it("returns false for packageName without version", () => {
      const skill: McpStdioSkill = {
        name: "@perstack/base",
        type: "mcpStdioSkill",
        command: "npx",
        packageName: "@perstack/base",
        requiredEnv: [],
      }
      expect(hasExplicitBaseVersion(skill)).toBe(false)
    })

    it("returns false for args without version", () => {
      const skill: McpStdioSkill = {
        name: "@perstack/base",
        type: "mcpStdioSkill",
        command: "npx",
        args: ["@perstack/base"],
        requiredEnv: [],
      }
      expect(hasExplicitBaseVersion(skill)).toBe(false)
    })

    it("returns false when no packageName or args", () => {
      const skill: McpStdioSkill = {
        name: "@perstack/base",
        type: "mcpStdioSkill",
        command: "node",
        requiredEnv: [],
      }
      expect(hasExplicitBaseVersion(skill)).toBe(false)
    })
  })

  describe("isBaseSkill", () => {
    it("returns true for skill named @perstack/base", () => {
      const skill: McpStdioSkill = {
        name: "@perstack/base",
        type: "mcpStdioSkill",
        command: "npx",
        requiredEnv: [],
      }
      expect(isBaseSkill(skill)).toBe(true)
    })

    it("returns true for skill with packageName starting with @perstack/base", () => {
      const skill: McpStdioSkill = {
        name: "some-skill",
        type: "mcpStdioSkill",
        command: "npx",
        packageName: "@perstack/base@1.0.0",
        requiredEnv: [],
      }
      expect(isBaseSkill(skill)).toBe(true)
    })

    it("returns true for skill with args containing @perstack/base", () => {
      const skill: McpStdioSkill = {
        name: "some-skill",
        type: "mcpStdioSkill",
        command: "npx",
        args: ["-y", "@perstack/base"],
        requiredEnv: [],
      }
      expect(isBaseSkill(skill)).toBe(true)
    })

    it("returns false for non-base skill", () => {
      const skill: McpStdioSkill = {
        name: "other-skill",
        type: "mcpStdioSkill",
        command: "npx",
        packageName: "@perstack/other",
        requiredEnv: [],
      }
      expect(isBaseSkill(skill)).toBe(false)
    })

    it("returns false for SSE skill without base name", () => {
      const skill: McpSseSkill = {
        name: "other-skill",
        type: "mcpSseSkill",
        url: "http://localhost:3000",
        requiredEnv: [],
      }
      expect(isBaseSkill(skill)).toBe(false)
    })
  })

  describe("shouldUseBundledBase", () => {
    it("returns true for base skill without explicit version and no custom command", () => {
      const skill: McpStdioSkill = {
        name: "@perstack/base",
        type: "mcpStdioSkill",
        command: "npx",
        packageName: "@perstack/base",
        requiredEnv: [],
      }
      expect(shouldUseBundledBase(skill)).toBe(true)
    })

    it("returns false when custom command is provided", () => {
      const skill: McpStdioSkill = {
        name: "@perstack/base",
        type: "mcpStdioSkill",
        command: "npx",
        packageName: "@perstack/base",
        requiredEnv: [],
      }
      expect(shouldUseBundledBase(skill, ["node", "custom.js"])).toBe(false)
    })

    it("returns false for SSE skills", () => {
      const skill: McpSseSkill = {
        name: "@perstack/base",
        type: "mcpSseSkill",
        url: "http://localhost:3000",
        requiredEnv: [],
      }
      expect(shouldUseBundledBase(skill)).toBe(false)
    })

    it("returns false for skill with explicit version", () => {
      const skill: McpStdioSkill = {
        name: "@perstack/base",
        type: "mcpStdioSkill",
        command: "npx",
        packageName: "@perstack/base@0.0.34",
        requiredEnv: [],
      }
      expect(shouldUseBundledBase(skill)).toBe(false)
    })
  })
})
