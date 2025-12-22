import type { McpSseSkill, McpStdioSkill } from "@perstack/core"
import { describe, expect, it } from "vitest"
import { hasExplicitBaseVersion, isBaseSkill, shouldUseBundledBase } from "./helpers.js"

const createMcpStdioSkill = (overrides: Partial<McpStdioSkill> = {}): McpStdioSkill => ({
  name: "@perstack/base",
  type: "mcpStdioSkill",
  command: "npx",
  packageName: "@perstack/base",
  args: [],
  pick: [],
  omit: [],
  requiredEnv: [],
  lazyInit: false,
  ...overrides,
})

const createMcpSseSkill = (overrides: Partial<McpSseSkill> = {}): McpSseSkill => ({
  name: "other-skill",
  type: "mcpSseSkill",
  endpoint: "https://example.com/sse",
  pick: [],
  omit: [],
  ...overrides,
})

describe("skill-manager helpers", () => {
  describe("hasExplicitBaseVersion", () => {
    it("returns true for packageName with version", () => {
      const skill = createMcpStdioSkill({ packageName: "@perstack/base@0.0.34" })
      expect(hasExplicitBaseVersion(skill)).toBe(true)
    })

    it("returns true for args with version", () => {
      const skill = createMcpStdioSkill({
        packageName: undefined,
        args: ["@perstack/base@1.2.3"],
      })
      expect(hasExplicitBaseVersion(skill)).toBe(true)
    })

    it("returns false for packageName without version", () => {
      const skill = createMcpStdioSkill({ packageName: "@perstack/base" })
      expect(hasExplicitBaseVersion(skill)).toBe(false)
    })

    it("returns false for args without version", () => {
      const skill = createMcpStdioSkill({
        packageName: undefined,
        args: ["@perstack/base"],
      })
      expect(hasExplicitBaseVersion(skill)).toBe(false)
    })

    it("returns false when no packageName or args", () => {
      const skill = createMcpStdioSkill({
        command: "node",
        packageName: undefined,
        args: [],
      })
      expect(hasExplicitBaseVersion(skill)).toBe(false)
    })
  })

  describe("isBaseSkill", () => {
    it("returns true for skill named @perstack/base", () => {
      const skill = createMcpStdioSkill({ name: "@perstack/base" })
      expect(isBaseSkill(skill)).toBe(true)
    })

    it("returns true for skill with packageName starting with @perstack/base", () => {
      const skill = createMcpStdioSkill({
        name: "some-skill",
        packageName: "@perstack/base@1.0.0",
      })
      expect(isBaseSkill(skill)).toBe(true)
    })

    it("returns true for skill with args containing @perstack/base", () => {
      const skill = createMcpStdioSkill({
        name: "some-skill",
        packageName: undefined,
        args: ["-y", "@perstack/base"],
      })
      expect(isBaseSkill(skill)).toBe(true)
    })

    it("returns false for non-base skill", () => {
      const skill = createMcpStdioSkill({
        name: "other-skill",
        packageName: "@perstack/other",
      })
      expect(isBaseSkill(skill)).toBe(false)
    })

    it("returns false for SSE skill without base name", () => {
      const skill = createMcpSseSkill({ name: "other-skill" })
      expect(isBaseSkill(skill)).toBe(false)
    })
  })

  describe("shouldUseBundledBase", () => {
    it("returns true for base skill without explicit version and no custom command", () => {
      const skill = createMcpStdioSkill({ packageName: "@perstack/base" })
      expect(shouldUseBundledBase(skill)).toBe(true)
    })

    it("returns false when custom command is provided", () => {
      const skill = createMcpStdioSkill({ packageName: "@perstack/base" })
      expect(shouldUseBundledBase(skill, ["node", "custom.js"])).toBe(false)
    })

    it("returns false for SSE skills", () => {
      const skill = createMcpSseSkill({ name: "@perstack/base" })
      expect(shouldUseBundledBase(skill)).toBe(false)
    })

    it("returns false for skill with explicit version", () => {
      const skill = createMcpStdioSkill({ packageName: "@perstack/base@0.0.34" })
      expect(shouldUseBundledBase(skill)).toBe(false)
    })
  })
})
