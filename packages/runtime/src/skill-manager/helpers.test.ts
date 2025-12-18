import type { ToolDefinition } from "@perstack/core"
import { describe, expect, it, vi } from "vitest"
import type { BaseSkillManager } from "./base.js"
import { closeSkillManagers, getSkillManagerByToolName, getToolSet } from "./helpers.js"

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
    const toolDefs1: ToolDefinition[] = [
      { name: "tool1", skillName: "skill1", inputSchema: {}, interactive: false },
    ]
    const toolDefs2: ToolDefinition[] = [
      { name: "tool2", skillName: "skill2", inputSchema: {}, interactive: false },
    ]
    const skillManagers = {
      skill1: {
        getToolDefinitions: vi.fn().mockResolvedValue(toolDefs1),
      } as unknown as BaseSkillManager,
      skill2: {
        getToolDefinitions: vi.fn().mockResolvedValue(toolDefs2),
      } as unknown as BaseSkillManager,
    }
    const result = await getSkillManagerByToolName(skillManagers, "tool2")
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

  it("includes tool descriptions in tool set", async () => {
    const toolDefs: ToolDefinition[] = [
      {
        name: "described-tool",
        skillName: "skill1",
        description: "A tool with description",
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
    expect(toolSet["described-tool"]).toBeDefined()
  })

  it("handles tools with complex input schemas", async () => {
    const toolDefs: ToolDefinition[] = [
      {
        name: "complex-tool",
        skillName: "skill1",
        description: "Complex tool",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string" },
            options: {
              type: "object",
              properties: {
                flag: { type: "boolean" },
              },
            },
          },
          required: ["name"],
        },
        interactive: false,
      },
    ]
    const skillManagers = {
      skill1: {
        getToolDefinitions: vi.fn().mockResolvedValue(toolDefs),
      } as unknown as BaseSkillManager,
    }
    const toolSet = await getToolSet(skillManagers)
    expect(toolSet["complex-tool"]).toBeDefined()
  })
})
