import type { Expert, InteractiveSkill, ToolDefinition } from "@perstack/core"
import { describe, expect, it, vi } from "vitest"
import {
  type BaseSkillManager,
  closeSkillManagers,
  DelegateSkillManager,
  getSkillManagerByToolName,
  getToolSet,
  InteractiveSkillManager,
  McpSkillManager,
} from "./skill-manager/index.js"

type McpSkillManagerInternal = {
  _doInit: () => Promise<void>
  _toolDefinitions: ToolDefinition[]
}

function createMcpSkill(overrides: Record<string, unknown> = {}) {
  return {
    type: "mcpStdioSkill" as const,
    name: "test-skill",
    description: "",
    command: "npx",
    args: ["@example/pkg"],
    requiredEnv: [],
    pick: [],
    omit: [],
    lazyInit: true,
    ...overrides,
  }
}

function createInteractiveSkill(overrides: Partial<InteractiveSkill> = {}): InteractiveSkill {
  return {
    type: "interactiveSkill",
    name: "interactive-skill",
    description: "An interactive skill",
    tools: {
      "interactive-tool": {
        name: "interactive-tool",
        description: "An interactive tool",
        inputJsonSchema: JSON.stringify({
          type: "object",
          properties: { input: { type: "string" } },
          required: ["input"],
        }),
      },
    },
    ...overrides,
  }
}

function createDelegateExpert(overrides: Partial<Expert> = {}): Expert {
  return {
    key: "delegate-expert",
    name: "@test/delegate-expert",
    version: "1.0.0",
    description: "A delegate expert",
    instruction: "Delegate expert instruction",
    skills: {},
    delegates: [],
    tags: [],
    runtime: ["perstack"],
    ...overrides,
  }
}

const testJobId = "test-job-id"
const testRunId = "test-run-id"

describe("@perstack/runtime: McpSkillManager", () => {
  it("starts init without awaiting when lazyInit true", async () => {
    const skill = createMcpSkill()
    const skillManager = new McpSkillManager(skill, {}, testJobId, testRunId)
    const sm = skillManager as unknown as McpSkillManagerInternal
    const initSpy = vi
      .spyOn(sm, "_doInit")
      .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 10)))
    await skillManager.init()
    expect(initSpy).toHaveBeenCalledTimes(1)
    expect(skillManager.isInitialized()).toBe(false)
  })

  it("waits for init completion when lazyInit false", async () => {
    const skill = createMcpSkill({ lazyInit: false })
    const skillManager = new McpSkillManager(skill, {}, testJobId, testRunId)
    const sm = skillManager as unknown as McpSkillManagerInternal
    const initSpy = vi
      .spyOn(sm, "_doInit")
      .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 10)))
    await skillManager.init()
    expect(initSpy).toHaveBeenCalledTimes(1)
    expect(skillManager.isInitialized()).toBe(true)
  })

  it("returns empty array from getToolDefinitions when lazyInit true", async () => {
    const skill = createMcpSkill()
    const skillManager = new McpSkillManager(skill, {}, testJobId, testRunId)
    const sm = skillManager as unknown as McpSkillManagerInternal
    vi.spyOn(sm, "_doInit").mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 10)),
    )
    await skillManager.init()
    expect(skillManager.isInitialized()).toBe(false)
    const tools = await skillManager.getToolDefinitions()
    expect(tools).toEqual([])
  })

  it("returns array from getToolDefinitions when lazyInit false", async () => {
    const skill = createMcpSkill({ lazyInit: false })
    const skillManager = new McpSkillManager(skill, {}, testJobId, testRunId)
    const sm = skillManager as unknown as McpSkillManagerInternal
    vi.spyOn(sm, "_doInit").mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            sm._toolDefinitions = [
              {
                name: "test-tool",
                skillName: "test-skill",
                inputSchema: {
                  type: "object",
                  properties: { test: { type: "string" } },
                  required: ["test"],
                },
                interactive: false,
              },
            ]
            resolve(undefined)
          }, 10)
        }),
    )
    await skillManager.init()
    expect(skillManager.isInitialized()).toBe(true)
    const tools = await skillManager.getToolDefinitions()
    expect(tools).toHaveLength(1)
    expect(tools[0].name).toBe("test-tool")
  })

  it("throws error from getToolDefinitions when not lazyInit and not initialized", async () => {
    const skill = createMcpSkill({ lazyInit: false, name: "test-eager" })
    const skillManager = new McpSkillManager(skill, {}, testJobId, testRunId)
    await expect(skillManager.getToolDefinitions()).rejects.toThrow("not initialized")
  })

  it("filters tools with pick option", async () => {
    const skill = createMcpSkill({ lazyInit: false, pick: ["allowed-tool"] })
    const skillManager = new McpSkillManager(skill, {}, testJobId, testRunId)
    const sm = skillManager as unknown as McpSkillManagerInternal
    vi.spyOn(sm, "_doInit").mockImplementation(
      () =>
        new Promise((resolve) => {
          sm._toolDefinitions = [
            {
              name: "allowed-tool",
              skillName: "test-skill",
              inputSchema: {},
              interactive: false,
            },
            {
              name: "blocked-tool",
              skillName: "test-skill",
              inputSchema: {},
              interactive: false,
            },
          ]
          resolve(undefined)
        }),
    )
    await skillManager.init()
    const tools = await skillManager.getToolDefinitions()
    expect(tools).toHaveLength(1)
    expect(tools[0].name).toBe("allowed-tool")
  })

  it("filters tools with omit option", async () => {
    const skill = createMcpSkill({ lazyInit: false, omit: ["blocked-tool"] })
    const skillManager = new McpSkillManager(skill, {}, testJobId, testRunId)
    const sm = skillManager as unknown as McpSkillManagerInternal
    vi.spyOn(sm, "_doInit").mockImplementation(
      () =>
        new Promise((resolve) => {
          sm._toolDefinitions = [
            {
              name: "allowed-tool",
              skillName: "test-skill",
              inputSchema: {},
              interactive: false,
            },
            {
              name: "blocked-tool",
              skillName: "test-skill",
              inputSchema: {},
              interactive: false,
            },
          ]
          resolve(undefined)
        }),
    )
    await skillManager.init()
    const tools = await skillManager.getToolDefinitions()
    expect(tools).toHaveLength(1)
    expect(tools[0].name).toBe("allowed-tool")
  })

  it("throws error when init called twice", async () => {
    const skill = createMcpSkill({ lazyInit: false })
    const skillManager = new McpSkillManager(skill, {}, testJobId, testRunId)
    const sm = skillManager as unknown as McpSkillManagerInternal
    vi.spyOn(sm, "_doInit").mockResolvedValue(undefined)
    await skillManager.init()
    await expect(skillManager.init()).rejects.toThrow("already initialized")
  })

  it("sets lazyInit false for @perstack/base skill", () => {
    const skill = createMcpSkill({ name: "@perstack/base", lazyInit: true })
    const skillManager = new McpSkillManager(skill, {}, testJobId, testRunId)
    expect(skillManager.lazyInit).toBe(false)
  })

  it("resets state when init fails with lazyInit false", async () => {
    const skill = createMcpSkill({ lazyInit: false })
    const skillManager = new McpSkillManager(skill, {}, testJobId, testRunId)
    const sm = skillManager as unknown as McpSkillManagerInternal
    vi.spyOn(sm, "_doInit").mockRejectedValue(new Error("Init failed"))
    await expect(skillManager.init()).rejects.toThrow("Init failed")
    expect(skillManager.isInitialized()).toBe(false)
  })

  it("throws error when init called while already initializing", async () => {
    const skill = createMcpSkill({ lazyInit: false })
    const skillManager = new McpSkillManager(skill, {}, testJobId, testRunId)
    const sm = skillManager as unknown as McpSkillManagerInternal
    vi.spyOn(sm, "_doInit").mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    )
    const initPromise = skillManager.init()
    await expect(skillManager.init()).rejects.toThrow("already initializing")
    await initPromise
  })

  it("initializes mcp sse skill with lazyInit false", () => {
    const skill = {
      type: "mcpSseSkill" as const,
      name: "sse-skill",
      endpoint: "https://example.com/sse",
      pick: [],
      omit: [],
    }
    const skillManager = new McpSkillManager(skill, {}, testJobId, testRunId)
    expect(skillManager.type).toBe("mcp")
    expect(skillManager.name).toBe("sse-skill")
    expect(skillManager.lazyInit).toBe(false)
  })
})

describe("@perstack/runtime: InteractiveSkillManager", () => {
  it("initializes interactive skill correctly", async () => {
    const interactiveSkill = createInteractiveSkill()
    const skillManager = new InteractiveSkillManager(interactiveSkill, testJobId, testRunId)
    expect(skillManager.type).toBe("interactive")
    expect(skillManager.name).toBe("interactive-skill")
    expect(skillManager.lazyInit).toBe(false)
    await skillManager.init()
    expect(skillManager.isInitialized()).toBe(true)
  })

  it("returns tool definitions for interactive skill", async () => {
    const interactiveSkill = createInteractiveSkill()
    const skillManager = new InteractiveSkillManager(interactiveSkill, testJobId, testRunId)
    await skillManager.init()
    const tools = await skillManager.getToolDefinitions()
    expect(tools).toHaveLength(1)
    expect(tools[0].name).toBe("interactive-tool")
    expect(tools[0].interactive).toBe(true)
  })

  it("callTool returns empty array for interactive skill", async () => {
    const interactiveSkill = createInteractiveSkill()
    const skillManager = new InteractiveSkillManager(interactiveSkill, testJobId, testRunId)
    await skillManager.init()
    const result = await skillManager.callTool("interactive-tool", { input: "test" })
    expect(result).toEqual([])
  })
})

describe("@perstack/runtime: DelegateSkillManager", () => {
  it("initializes delegate skill correctly", async () => {
    const expert = createDelegateExpert()
    const skillManager = new DelegateSkillManager(expert, testJobId, testRunId)
    expect(skillManager.type).toBe("delegate")
    expect(skillManager.name).toBe("@test/delegate-expert")
    expect(skillManager.lazyInit).toBe(false)
    await skillManager.init()
    expect(skillManager.isInitialized()).toBe(true)
  })

  it("returns tool definitions for delegate skill", async () => {
    const expert = createDelegateExpert()
    const skillManager = new DelegateSkillManager(expert, testJobId, testRunId)
    await skillManager.init()
    const tools = await skillManager.getToolDefinitions()
    expect(tools).toHaveLength(1)
    expect(tools[0].name).toBe("delegate-expert")
    expect(tools[0].skillName).toBe("@test/delegate-expert")
    expect(tools[0].inputSchema).toEqual({
      type: "object",
      properties: {
        query: { type: "string" },
        runtime: {
          oneOf: [
            { type: "string", enum: ["perstack", "cursor", "claude-code", "gemini"] },
            {
              type: "array",
              items: { type: "string", enum: ["perstack", "cursor", "claude-code", "gemini"] },
            },
          ],
        },
      },
      required: ["query"],
    })
  })

  it("callTool returns empty array for delegate skill", async () => {
    const expert = createDelegateExpert()
    const skillManager = new DelegateSkillManager(expert, testJobId, testRunId)
    await skillManager.init()
    const result = await skillManager.callTool("delegate-expert", { query: "test" })
    expect(result).toEqual([])
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
})
