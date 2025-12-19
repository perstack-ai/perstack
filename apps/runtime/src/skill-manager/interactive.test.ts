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

  it("handles multiple tools", async () => {
    const interactiveSkill = createInteractiveSkill({
      tools: {
        tool1: {
          name: "tool1",
          description: "First tool",
          inputJsonSchema: JSON.stringify({ type: "object" }),
        },
        tool2: {
          name: "tool2",
          description: "Second tool",
          inputJsonSchema: JSON.stringify({ type: "object" }),
        },
      },
    })
    const skillManager = new InteractiveSkillManager(interactiveSkill, testJobId, testRunId)
    await skillManager.init()
    const tools = await skillManager.getToolDefinitions()
    expect(tools).toHaveLength(2)
    expect(tools.map((t) => t.name).sort()).toEqual(["tool1", "tool2"])
  })

  it("close resolves without error", async () => {
    const interactiveSkill = createInteractiveSkill()
    const skillManager = new InteractiveSkillManager(interactiveSkill, testJobId, testRunId)
    await skillManager.init()
    await expect(skillManager.close()).resolves.toBeUndefined()
  })
})
