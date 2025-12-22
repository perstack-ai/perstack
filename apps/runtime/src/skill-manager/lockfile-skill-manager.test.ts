import type { LockfileToolDefinition, McpStdioSkill } from "@perstack/core"
import { describe, expect, it } from "vitest"
import { LockfileSkillManager } from "./lockfile-skill-manager.js"

describe("LockfileSkillManager", () => {
  const createMockSkill = (overrides: Partial<McpStdioSkill> = {}): McpStdioSkill => ({
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

  const createMockToolDefinitions = (): LockfileToolDefinition[] => [
    {
      skillName: "@perstack/base",
      name: "readFile",
      description: "Read a file",
      inputSchema: { type: "object", properties: { path: { type: "string" } } },
    },
    {
      skillName: "@perstack/base",
      name: "writeFile",
      description: "Write a file",
      inputSchema: { type: "object", properties: { path: { type: "string" } } },
    },
  ]

  it("should return cached tool definitions without initializing real manager", async () => {
    const manager = new LockfileSkillManager({
      skill: createMockSkill(),
      toolDefinitions: createMockToolDefinitions(),
      env: {},
      jobId: "test-job",
      runId: "test-run",
    })

    await manager.init()
    const tools = await manager.getToolDefinitions()

    expect(tools).toHaveLength(2)
    expect(tools[0].name).toBe("readFile")
    expect(tools[1].name).toBe("writeFile")
  })

  it("should have lazyInit set to true", () => {
    const manager = new LockfileSkillManager({
      skill: createMockSkill(),
      toolDefinitions: createMockToolDefinitions(),
      env: {},
      jobId: "test-job",
      runId: "test-run",
    })

    expect(manager.lazyInit).toBe(true)
  })

  it("should filter tools based on pick option", async () => {
    const skill = createMockSkill({ pick: ["readFile"] })

    const manager = new LockfileSkillManager({
      skill,
      toolDefinitions: createMockToolDefinitions(),
      env: {},
      jobId: "test-job",
      runId: "test-run",
    })

    await manager.init()
    const tools = await manager.getToolDefinitions()

    expect(tools).toHaveLength(1)
    expect(tools[0].name).toBe("readFile")
  })

  it("should filter tools based on omit option", async () => {
    const skill = createMockSkill({ omit: ["writeFile"] })

    const manager = new LockfileSkillManager({
      skill,
      toolDefinitions: createMockToolDefinitions(),
      env: {},
      jobId: "test-job",
      runId: "test-run",
    })

    await manager.init()
    const tools = await manager.getToolDefinitions()

    expect(tools).toHaveLength(1)
    expect(tools[0].name).toBe("readFile")
  })

  it("should close without error when real manager was never initialized", async () => {
    const manager = new LockfileSkillManager({
      skill: createMockSkill(),
      toolDefinitions: createMockToolDefinitions(),
      env: {},
      jobId: "test-job",
      runId: "test-run",
    })

    await manager.init()
    await expect(manager.close()).resolves.not.toThrow()
  })
})
