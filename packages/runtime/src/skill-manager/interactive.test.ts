import type { InteractiveSkill } from "@perstack/core"
import { describe, expect, it } from "vitest"
import { InteractiveSkillManager } from "./interactive.js"

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

const testJobId = "test-job-id"
const testRunId = "test-run-id"

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

  it("handles multiple tools correctly", async () => {
    const interactiveSkill = createInteractiveSkill({
      tools: {
        "tool-1": {
          name: "tool-1",
          description: "First tool",
          inputJsonSchema: JSON.stringify({ type: "object", properties: {} }),
        },
        "tool-2": {
          name: "tool-2",
          description: "Second tool",
          inputJsonSchema: JSON.stringify({ type: "object", properties: {} }),
        },
      },
    })
    const skillManager = new InteractiveSkillManager(interactiveSkill, testJobId, testRunId)
    await skillManager.init()
    const tools = await skillManager.getToolDefinitions()
    expect(tools).toHaveLength(2)
    expect(tools.map((t) => t.name)).toContain("tool-1")
    expect(tools.map((t) => t.name)).toContain("tool-2")
  })

  it("parses input schema correctly", async () => {
    const interactiveSkill = createInteractiveSkill({
      tools: {
        "complex-tool": {
          name: "complex-tool",
          description: "Complex tool",
          inputJsonSchema: JSON.stringify({
            type: "object",
            properties: {
              name: { type: "string" },
              count: { type: "number" },
            },
            required: ["name"],
          }),
        },
      },
    })
    const skillManager = new InteractiveSkillManager(interactiveSkill, testJobId, testRunId)
    await skillManager.init()
    const tools = await skillManager.getToolDefinitions()
    expect(tools[0].inputSchema).toEqual({
      type: "object",
      properties: {
        name: { type: "string" },
        count: { type: "number" },
      },
      required: ["name"],
    })
  })

  it("stores interactiveSkill reference correctly", () => {
    const interactiveSkill = createInteractiveSkill()
    const skillManager = new InteractiveSkillManager(interactiveSkill, testJobId, testRunId)
    expect(skillManager.interactiveSkill).toBe(interactiveSkill)
  })

  it("close method completes without error", async () => {
    const interactiveSkill = createInteractiveSkill()
    const skillManager = new InteractiveSkillManager(interactiveSkill, testJobId, testRunId)
    await skillManager.init()
    await expect(skillManager.close()).resolves.toBeUndefined()
  })

  it("includes skill name in tool definitions", async () => {
    const interactiveSkill = createInteractiveSkill({ name: "custom-skill" })
    const skillManager = new InteractiveSkillManager(interactiveSkill, testJobId, testRunId)
    await skillManager.init()
    const tools = await skillManager.getToolDefinitions()
    expect(tools[0].skillName).toBe("custom-skill")
  })

  it("includes tool description in tool definitions", async () => {
    const interactiveSkill = createInteractiveSkill({
      tools: {
        "described-tool": {
          name: "described-tool",
          description: "This is a detailed description",
          inputJsonSchema: JSON.stringify({ type: "object" }),
        },
      },
    })
    const skillManager = new InteractiveSkillManager(interactiveSkill, testJobId, testRunId)
    await skillManager.init()
    const tools = await skillManager.getToolDefinitions()
    expect(tools[0].description).toBe("This is a detailed description")
  })
})
