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

  it("extracts tool name from expert name", async () => {
    const expert = createDelegateExpert({ name: "@perstack/code-reviewer" })
    const skillManager = new DelegateSkillManager(expert, testJobId, testRunId)
    await skillManager.init()
    const tools = await skillManager.getToolDefinitions()
    expect(tools[0].name).toBe("code-reviewer")
  })

  it("includes expert description in tool definition", async () => {
    const expert = createDelegateExpert({ description: "Expert for code review" })
    const skillManager = new DelegateSkillManager(expert, testJobId, testRunId)
    await skillManager.init()
    const tools = await skillManager.getToolDefinitions()
    expect(tools[0].description).toBe("Expert for code review")
  })

  it("close resolves without error", async () => {
    const expert = createDelegateExpert()
    const skillManager = new DelegateSkillManager(expert, testJobId, testRunId)
    await skillManager.init()
    await expect(skillManager.close()).resolves.toBeUndefined()
  })
})
