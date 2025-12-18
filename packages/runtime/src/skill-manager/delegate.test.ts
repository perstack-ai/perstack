import type { Expert } from "@perstack/core"
import { describe, expect, it } from "vitest"
import { DelegateSkillManager } from "./delegate.js"

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
    ...overrides,
  }
}

const testJobId = "test-job-id"
const testRunId = "test-run-id"

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

  it("extracts tool name from expert name with slash", async () => {
    const expert = createDelegateExpert({ name: "@org/package/expert-name" })
    const skillManager = new DelegateSkillManager(expert, testJobId, testRunId)
    await skillManager.init()
    const tools = await skillManager.getToolDefinitions()
    expect(tools[0].name).toBe("expert-name")
    expect(tools[0].skillName).toBe("@org/package/expert-name")
  })

  it("uses full name as tool name when no slash present", async () => {
    const expert = createDelegateExpert({ name: "simple-expert" })
    const skillManager = new DelegateSkillManager(expert, testJobId, testRunId)
    await skillManager.init()
    const tools = await skillManager.getToolDefinitions()
    expect(tools[0].name).toBe("simple-expert")
  })

  it("includes expert description in tool definition", async () => {
    const expert = createDelegateExpert({ description: "Custom description" })
    const skillManager = new DelegateSkillManager(expert, testJobId, testRunId)
    await skillManager.init()
    const tools = await skillManager.getToolDefinitions()
    expect(tools[0].description).toBe("Custom description")
  })

  it("close method completes without error", async () => {
    const expert = createDelegateExpert()
    const skillManager = new DelegateSkillManager(expert, testJobId, testRunId)
    await skillManager.init()
    await expect(skillManager.close()).resolves.toBeUndefined()
  })

  it("stores expert reference correctly", () => {
    const expert = createDelegateExpert()
    const skillManager = new DelegateSkillManager(expert, testJobId, testRunId)
    expect(skillManager.expert).toBe(expert)
  })
})
