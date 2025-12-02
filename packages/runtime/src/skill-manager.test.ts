import { describe, expect, it, vi } from "vitest"
import { SkillManager } from "./skill-manager.js"

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

const testRunId = "test-run-id"

describe("@perstack/runtime: skillManager", () => {
  it("starts init without awaiting when lazyInit true", async () => {
    const skill = createMcpSkill()
    const skillManager = new SkillManager({ type: "mcp", skill, env: {} }, testRunId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const initSpy = vi.spyOn(skillManager as any, "_initMcpSkill").mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(resolve, 10)
        }),
    )
    await skillManager.init()
    expect(initSpy).toHaveBeenCalledTimes(1)
    expect(skillManager.isInitialized()).toBe(false)
  })

  it("waits for init completion when lazyInit false", async () => {
    const skill = createMcpSkill({ lazyInit: false })
    const skillManager = new SkillManager({ type: "mcp", skill, env: {} }, testRunId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const initSpy = vi.spyOn(skillManager as any, "_initMcpSkill").mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(resolve, 10)
        }),
    )
    await skillManager.init()
    expect(initSpy).toHaveBeenCalledTimes(1)
    expect(skillManager.isInitialized()).toBe(true)
  })

  it("returns empty array from getToolDefinitions when lazyInit true", async () => {
    const skill = createMcpSkill()
    const skillManager = new SkillManager({ type: "mcp", skill, env: {} }, testRunId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const initSpy = vi.spyOn(skillManager as any, "_initMcpSkill").mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(resolve, 10)
        }),
    )
    await skillManager.init()
    expect(initSpy).toHaveBeenCalledTimes(1)
    expect(skillManager.isInitialized()).toBe(false)
    const tools = await skillManager.getToolDefinitions()
    expect(tools).toEqual([])
  })

  it("returns array from getToolDefinitions when lazyInit false", async () => {
    const skill = createMcpSkill({ lazyInit: false })
    const skillManager = new SkillManager({ type: "mcp", skill, env: {} }, testRunId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const initSpy = vi.spyOn(skillManager as any, "_initMcpSkill").mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(skillManager as any)._toolDefinitions = [
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
    expect(initSpy).toHaveBeenCalledTimes(1)
    expect(skillManager.isInitialized()).toBe(true)
    const tools = await skillManager.getToolDefinitions()
    expect(tools).toEqual([
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
    ])
  })

  it("throws error from getToolDefinitions when not lazyInit and not initialized", async () => {
    const skill = createMcpSkill({ lazyInit: false, name: "test-eager" })
    const skillManager = new SkillManager({ type: "mcp", skill, env: {} }, testRunId)
    await expect(skillManager.getToolDefinitions()).rejects.toThrow("not initialized")
  })
})
