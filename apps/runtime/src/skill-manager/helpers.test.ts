import type { McpSseSkill, McpStdioSkill, ToolDefinition } from "@perstack/core"
import { describe, expect, it, vi } from "vitest"
import type { BaseSkillManager } from "./base.js"
import {
  closeSkillManagers,
  getSkillManagerByToolName,
  getToolSet,
  hasExplicitBaseVersion,
  initSkillManagersWithCleanup,
  isBaseSkill,
  shouldUseBundledBase,
} from "./helpers.js"

describe("@perstack/runtime: initSkillManagersWithCleanup", () => {
  it("initializes all managers successfully", async () => {
    const initFn1 = vi.fn().mockResolvedValue(undefined)
    const initFn2 = vi.fn().mockResolvedValue(undefined)
    const managers = [
      { init: initFn1, close: vi.fn() } as unknown as BaseSkillManager,
      { init: initFn2, close: vi.fn() } as unknown as BaseSkillManager,
    ]
    await initSkillManagersWithCleanup(managers, managers)
    expect(initFn1).toHaveBeenCalledTimes(1)
    expect(initFn2).toHaveBeenCalledTimes(1)
  })

  it("closes all managers when one fails to initialize", async () => {
    const closeFn1 = vi.fn().mockResolvedValue(undefined)
    const closeFn2 = vi.fn().mockResolvedValue(undefined)
    const managers = [
      {
        init: vi.fn().mockRejectedValue(new Error("init failed")),
        close: closeFn1,
      } as unknown as BaseSkillManager,
      {
        init: vi.fn().mockResolvedValue(undefined),
        close: closeFn2,
      } as unknown as BaseSkillManager,
    ]
    await expect(initSkillManagersWithCleanup(managers, managers)).rejects.toThrow("init failed")
    expect(closeFn1).toHaveBeenCalledTimes(1)
    expect(closeFn2).toHaveBeenCalledTimes(1)
  })

  it("handles empty managers array", async () => {
    await expect(initSkillManagersWithCleanup([], [])).resolves.toBeUndefined()
  })

  it("closes allManagers (not just failed subset) on failure", async () => {
    const closeFn1 = vi.fn().mockResolvedValue(undefined)
    const closeFn2 = vi.fn().mockResolvedValue(undefined)
    const closeFn3 = vi.fn().mockResolvedValue(undefined)
    const manager1 = {
      init: vi.fn().mockResolvedValue(undefined),
      close: closeFn1,
    } as unknown as BaseSkillManager
    const manager2 = {
      init: vi.fn().mockRejectedValue(new Error("fail")),
      close: closeFn2,
    } as unknown as BaseSkillManager
    const allManagers = [
      manager1,
      { init: vi.fn(), close: closeFn3 } as unknown as BaseSkillManager,
    ]
    await expect(initSkillManagersWithCleanup([manager2], allManagers)).rejects.toThrow("fail")
    expect(closeFn1).toHaveBeenCalledTimes(1)
    expect(closeFn3).toHaveBeenCalledTimes(1)
  })

  it("ignores close errors during cleanup", async () => {
    const closeFn = vi.fn().mockRejectedValue(new Error("close failed"))
    const managers = [
      {
        init: vi.fn().mockRejectedValue(new Error("init failed")),
        close: closeFn,
      } as unknown as BaseSkillManager,
    ]
    await expect(initSkillManagersWithCleanup(managers, managers)).rejects.toThrow("init failed")
    expect(closeFn).toHaveBeenCalledTimes(1)
  })
})

describe("@perstack/runtime: closeSkillManagers", () => {
  it("closes all skill managers", async () => {
    const closeFn1 = vi.fn().mockResolvedValue(undefined)
    const closeFn2 = vi.fn().mockResolvedValue(undefined)
    const skillManagers = {
      skill1: { close: closeFn1 } as unknown as BaseSkillManager,
      skill2: { close: closeFn2 } as unknown as BaseSkillManager,
    }
    await closeSkillManagers(skillManagers)
    expect(closeFn1).toHaveBeenCalledTimes(1)
    expect(closeFn2).toHaveBeenCalledTimes(1)
  })

  it("continues closing other managers when one fails", async () => {
    const closeFn1 = vi.fn().mockRejectedValue(new Error("close failed"))
    const closeFn2 = vi.fn().mockResolvedValue(undefined)
    const skillManagers = {
      skill1: { close: closeFn1 } as unknown as BaseSkillManager,
      skill2: { close: closeFn2 } as unknown as BaseSkillManager,
    }
    await closeSkillManagers(skillManagers)
    expect(closeFn1).toHaveBeenCalledTimes(1)
    expect(closeFn2).toHaveBeenCalledTimes(1)
  })

  it("handles empty skill managers", async () => {
    await expect(closeSkillManagers({})).resolves.toBeUndefined()
  })
})

describe("@perstack/runtime: getSkillManagerByToolName", () => {
  it("returns skill manager that has the tool", async () => {
    const toolDefs: ToolDefinition[] = [
      { name: "target-tool", skillName: "skill1", inputSchema: {}, interactive: false },
    ]
    const skillManagers = {
      skill1: {
        getToolDefinitions: vi.fn().mockResolvedValue(toolDefs),
      } as unknown as BaseSkillManager,
      skill2: {
        getToolDefinitions: vi.fn().mockResolvedValue([]),
      } as unknown as BaseSkillManager,
    }
    const result = await getSkillManagerByToolName(skillManagers, "target-tool")
    expect(result).toBe(skillManagers.skill1)
  })

  it("throws error when tool not found", async () => {
    const skillManagers = {
      skill1: {
        getToolDefinitions: vi.fn().mockResolvedValue([]),
      } as unknown as BaseSkillManager,
    }
    await expect(getSkillManagerByToolName(skillManagers, "nonexistent")).rejects.toThrow(
      "Tool nonexistent not found",
    )
  })

  it("searches through multiple skill managers", async () => {
    const skillManagers = {
      skill1: {
        getToolDefinitions: vi.fn().mockResolvedValue([]),
      } as unknown as BaseSkillManager,
      skill2: {
        getToolDefinitions: vi
          .fn()
          .mockResolvedValue([
            { name: "found-tool", skillName: "skill2", inputSchema: {}, interactive: false },
          ]),
      } as unknown as BaseSkillManager,
    }
    const result = await getSkillManagerByToolName(skillManagers, "found-tool")
    expect(result).toBe(skillManagers.skill2)
  })
})

describe("@perstack/runtime: getToolSet", () => {
  it("returns tool set from all skill managers", async () => {
    const toolDefs1: ToolDefinition[] = [
      {
        name: "tool1",
        skillName: "skill1",
        description: "Tool 1",
        inputSchema: { type: "object", properties: {} },
        interactive: false,
      },
    ]
    const toolDefs2: ToolDefinition[] = [
      {
        name: "tool2",
        skillName: "skill2",
        description: "Tool 2",
        inputSchema: { type: "object", properties: {} },
        interactive: false,
      },
    ]
    const skillManagers = {
      skill1: {
        getToolDefinitions: vi.fn().mockResolvedValue(toolDefs1),
      } as unknown as BaseSkillManager,
      skill2: {
        getToolDefinitions: vi.fn().mockResolvedValue(toolDefs2),
      } as unknown as BaseSkillManager,
    }
    const toolSet = await getToolSet(skillManagers)
    expect(Object.keys(toolSet)).toHaveLength(2)
    expect(toolSet.tool1).toBeDefined()
    expect(toolSet.tool2).toBeDefined()
  })

  it("returns empty tool set for empty skill managers", async () => {
    const toolSet = await getToolSet({})
    expect(Object.keys(toolSet)).toHaveLength(0)
  })

  it("includes tool description in tool set", async () => {
    const toolDefs: ToolDefinition[] = [
      {
        name: "my-tool",
        skillName: "skill1",
        description: "My special tool",
        inputSchema: { type: "object", properties: {} },
        interactive: false,
      },
    ]
    const skillManagers = {
      skill1: {
        getToolDefinitions: vi.fn().mockResolvedValue(toolDefs),
      } as unknown as BaseSkillManager,
    }
    const toolSet = await getToolSet(skillManagers)
    expect(toolSet["my-tool"]).toBeDefined()
  })
})

describe("@perstack/runtime: hasExplicitBaseVersion", () => {
  it("returns true when packageName has version", () => {
    const skill: McpStdioSkill = {
      type: "mcpStdioSkill",
      name: "@perstack/base",
      command: "npx",
      packageName: "@perstack/base@0.0.34",
      args: [],
      pick: [],
      omit: [],
      requiredEnv: [],
      lazyInit: false,
    }
    expect(hasExplicitBaseVersion(skill)).toBe(true)
  })

  it("returns true when args contain versioned package", () => {
    const skill: McpStdioSkill = {
      type: "mcpStdioSkill",
      name: "@perstack/base",
      command: "npx",
      args: ["@perstack/base@1.2.3"],
      pick: [],
      omit: [],
      requiredEnv: [],
      lazyInit: false,
    }
    expect(hasExplicitBaseVersion(skill)).toBe(true)
  })

  it("returns false when packageName has no version", () => {
    const skill: McpStdioSkill = {
      type: "mcpStdioSkill",
      name: "@perstack/base",
      command: "npx",
      packageName: "@perstack/base",
      args: [],
      pick: [],
      omit: [],
      requiredEnv: [],
      lazyInit: false,
    }
    expect(hasExplicitBaseVersion(skill)).toBe(false)
  })

  it("returns false when args contain unversioned package", () => {
    const skill: McpStdioSkill = {
      type: "mcpStdioSkill",
      name: "@perstack/base",
      command: "npx",
      args: ["@perstack/base"],
      pick: [],
      omit: [],
      requiredEnv: [],
      lazyInit: false,
    }
    expect(hasExplicitBaseVersion(skill)).toBe(false)
  })

  it("returns false when args is empty", () => {
    const skill: McpStdioSkill = {
      type: "mcpStdioSkill",
      name: "@perstack/base",
      command: "npx",
      args: [],
      pick: [],
      omit: [],
      requiredEnv: [],
      lazyInit: false,
    }
    expect(hasExplicitBaseVersion(skill)).toBe(false)
  })
})

describe("@perstack/runtime: isBaseSkill", () => {
  it("returns true when skill name is @perstack/base", () => {
    const skill: McpStdioSkill = {
      type: "mcpStdioSkill",
      name: "@perstack/base",
      command: "npx",
      args: [],
      pick: [],
      omit: [],
      requiredEnv: [],
      lazyInit: false,
    }
    expect(isBaseSkill(skill)).toBe(true)
  })

  it("returns true when packageName starts with @perstack/base", () => {
    const skill: McpStdioSkill = {
      type: "mcpStdioSkill",
      name: "base-skill",
      command: "npx",
      packageName: "@perstack/base@1.0.0",
      args: [],
      pick: [],
      omit: [],
      requiredEnv: [],
      lazyInit: false,
    }
    expect(isBaseSkill(skill)).toBe(true)
  })

  it("returns true when args contain @perstack/base", () => {
    const skill: McpStdioSkill = {
      type: "mcpStdioSkill",
      name: "base-skill",
      command: "npx",
      args: ["-y", "@perstack/base"],
      pick: [],
      omit: [],
      requiredEnv: [],
      lazyInit: false,
    }
    expect(isBaseSkill(skill)).toBe(true)
  })

  it("returns false for non-base skill", () => {
    const skill: McpStdioSkill = {
      type: "mcpStdioSkill",
      name: "other-skill",
      command: "npx",
      packageName: "@other/package",
      args: [],
      pick: [],
      omit: [],
      requiredEnv: [],
      lazyInit: false,
    }
    expect(isBaseSkill(skill)).toBe(false)
  })

  it("returns false for SSE skill with non-base name", () => {
    const skill: McpSseSkill = {
      type: "mcpSseSkill",
      name: "other-skill",
      endpoint: "https://example.com/sse",
      pick: [],
      omit: [],
    }
    expect(isBaseSkill(skill)).toBe(false)
  })
})

describe("@perstack/runtime: shouldUseBundledBase", () => {
  it("returns true for default base skill without version", () => {
    const skill: McpStdioSkill = {
      type: "mcpStdioSkill",
      name: "@perstack/base",
      command: "npx",
      packageName: "@perstack/base",
      args: [],
      pick: [],
      omit: [],
      requiredEnv: [],
      lazyInit: false,
    }
    expect(shouldUseBundledBase(skill)).toBe(true)
  })

  it("returns false when perstackBaseSkillCommand is set", () => {
    const skill: McpStdioSkill = {
      type: "mcpStdioSkill",
      name: "@perstack/base",
      command: "npx",
      packageName: "@perstack/base",
      args: [],
      pick: [],
      omit: [],
      requiredEnv: [],
      lazyInit: false,
    }
    expect(shouldUseBundledBase(skill, ["node", "custom-base.js"])).toBe(false)
  })

  it("returns false when explicit version is specified", () => {
    const skill: McpStdioSkill = {
      type: "mcpStdioSkill",
      name: "@perstack/base",
      command: "npx",
      packageName: "@perstack/base@0.0.34",
      args: [],
      pick: [],
      omit: [],
      requiredEnv: [],
      lazyInit: false,
    }
    expect(shouldUseBundledBase(skill)).toBe(false)
  })

  it("returns false for SSE skill", () => {
    const skill: McpSseSkill = {
      type: "mcpSseSkill",
      name: "@perstack/base",
      endpoint: "https://example.com/sse",
      pick: [],
      omit: [],
    }
    expect(shouldUseBundledBase(skill)).toBe(false)
  })
})
