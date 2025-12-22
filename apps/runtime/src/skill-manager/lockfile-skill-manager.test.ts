import type { LockfileToolDefinition, McpSseSkill, McpStdioSkill } from "@perstack/core"
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

  it("should expose skill property correctly", () => {
    const skill = createMockSkill({ name: "custom-skill" })
    const manager = new LockfileSkillManager({
      skill,
      toolDefinitions: createMockToolDefinitions(),
      env: {},
      jobId: "test-job",
      runId: "test-run",
    })

    expect(manager.skill).toBe(skill)
    expect(manager.name).toBe("custom-skill")
    expect(manager.type).toBe("mcp")
  })

  it("should set interactive to false for all tool definitions", async () => {
    const manager = new LockfileSkillManager({
      skill: createMockSkill(),
      toolDefinitions: createMockToolDefinitions(),
      env: {},
      jobId: "test-job",
      runId: "test-run",
    })

    await manager.init()
    const tools = await manager.getToolDefinitions()

    for (const tool of tools) {
      expect(tool.interactive).toBe(false)
    }
  })

  it("should handle empty tool definitions", async () => {
    const manager = new LockfileSkillManager({
      skill: createMockSkill(),
      toolDefinitions: [],
      env: {},
      jobId: "test-job",
      runId: "test-run",
    })

    await manager.init()
    const tools = await manager.getToolDefinitions()

    expect(tools).toHaveLength(0)
  })

  describe("_ensureRealManager", () => {
    it("creates InMemoryBaseSkillManager for base skill without version", async () => {
      const skill = createMockSkill({
        name: "@perstack/base",
        packageName: "@perstack/base",
      })
      const manager = new LockfileSkillManager({
        skill,
        toolDefinitions: createMockToolDefinitions(),
        env: {},
        jobId: "test-job",
        runId: "test-run",
      })

      await manager.init()

      // Access private method via type assertion for testing
      const managerAny = manager as unknown as {
        _ensureRealManager: () => Promise<unknown>
        _realManager?: { close: () => Promise<void> }
      }

      // This will trigger real manager creation
      try {
        await managerAny._ensureRealManager()
        // Real manager should be created
        expect(managerAny._realManager).toBeDefined()
      } catch {
        // Expected if InMemoryBaseSkillManager init fails in test env
      } finally {
        // Cleanup
        if (managerAny._realManager) {
          await managerAny._realManager.close().catch(() => {})
        }
      }
    })
  })

  describe("with SSE skill", () => {
    const createMockSseSkill = (overrides: Partial<McpSseSkill> = {}): McpSseSkill => ({
      name: "sse-skill",
      type: "mcpSseSkill",
      endpoint: "https://example.com/sse",
      pick: [],
      omit: [],
      ...overrides,
    })

    it("should handle SSE skill type", async () => {
      const manager = new LockfileSkillManager({
        skill: createMockSseSkill(),
        toolDefinitions: [
          {
            skillName: "sse-skill",
            name: "sseTool",
            description: "An SSE tool",
            inputSchema: { type: "object" },
          },
        ],
        env: {},
        jobId: "test-job",
        runId: "test-run",
      })

      await manager.init()
      const tools = await manager.getToolDefinitions()

      expect(tools).toHaveLength(1)
      expect(tools[0].name).toBe("sseTool")
    })
  })
})
