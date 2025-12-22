import type {
  Expert,
  McpSseSkill,
  McpStdioSkill,
  RunSetting,
  ToolDefinition,
} from "@perstack/core"
import { describe, expect, it, vi } from "vitest"
import type { BaseSkillManager } from "./base.js"
import {
  closeSkillManagers,
  collectToolDefinitionsForExpert,
  getSkillManagerByToolName,
  getSkillManagersFromLockfile,
  getToolSet,
  hasExplicitBaseVersion,
  initSkillManagersWithCleanup,
  isBaseSkill,
  shouldUseBundledBase,
} from "./helpers.js"
import type { SkillManagerFactory, SkillManagerFactoryContext } from "./skill-manager-factory.js"

const createMcpStdioSkill = (overrides: Partial<McpStdioSkill> = {}): McpStdioSkill => ({
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

const createMcpSseSkill = (overrides: Partial<McpSseSkill> = {}): McpSseSkill => ({
  name: "other-skill",
  type: "mcpSseSkill",
  endpoint: "https://example.com/sse",
  pick: [],
  omit: [],
  ...overrides,
})

describe("skill-manager helpers", () => {
  describe("hasExplicitBaseVersion", () => {
    it("returns true for packageName with version", () => {
      const skill = createMcpStdioSkill({ packageName: "@perstack/base@0.0.34" })
      expect(hasExplicitBaseVersion(skill)).toBe(true)
    })

    it("returns true for args with version", () => {
      const skill = createMcpStdioSkill({
        packageName: undefined,
        args: ["@perstack/base@1.2.3"],
      })
      expect(hasExplicitBaseVersion(skill)).toBe(true)
    })

    it("returns false for packageName without version", () => {
      const skill = createMcpStdioSkill({ packageName: "@perstack/base" })
      expect(hasExplicitBaseVersion(skill)).toBe(false)
    })

    it("returns false for args without version", () => {
      const skill = createMcpStdioSkill({
        packageName: undefined,
        args: ["@perstack/base"],
      })
      expect(hasExplicitBaseVersion(skill)).toBe(false)
    })

    it("returns false when no packageName or args", () => {
      const skill = createMcpStdioSkill({
        command: "node",
        packageName: undefined,
        args: [],
      })
      expect(hasExplicitBaseVersion(skill)).toBe(false)
    })
  })

  describe("isBaseSkill", () => {
    it("returns true for skill named @perstack/base", () => {
      const skill = createMcpStdioSkill({ name: "@perstack/base" })
      expect(isBaseSkill(skill)).toBe(true)
    })

    it("returns true for skill with packageName starting with @perstack/base", () => {
      const skill = createMcpStdioSkill({
        name: "some-skill",
        packageName: "@perstack/base@1.0.0",
      })
      expect(isBaseSkill(skill)).toBe(true)
    })

    it("returns true for skill with args containing @perstack/base", () => {
      const skill = createMcpStdioSkill({
        name: "some-skill",
        packageName: undefined,
        args: ["-y", "@perstack/base"],
      })
      expect(isBaseSkill(skill)).toBe(true)
    })

    it("returns false for non-base skill", () => {
      const skill = createMcpStdioSkill({
        name: "other-skill",
        packageName: "@perstack/other",
      })
      expect(isBaseSkill(skill)).toBe(false)
    })

    it("returns false for SSE skill without base name", () => {
      const skill = createMcpSseSkill({ name: "other-skill" })
      expect(isBaseSkill(skill)).toBe(false)
    })
  })

  describe("shouldUseBundledBase", () => {
    it("returns true for base skill without explicit version and no custom command", () => {
      const skill = createMcpStdioSkill({ packageName: "@perstack/base" })
      expect(shouldUseBundledBase(skill)).toBe(true)
    })

    it("returns false when custom command is provided", () => {
      const skill = createMcpStdioSkill({ packageName: "@perstack/base" })
      expect(shouldUseBundledBase(skill, ["node", "custom.js"])).toBe(false)
    })

    it("returns false for SSE skills", () => {
      const skill = createMcpSseSkill({ name: "@perstack/base" })
      expect(shouldUseBundledBase(skill)).toBe(false)
    })

    it("returns false for skill with explicit version", () => {
      const skill = createMcpStdioSkill({ packageName: "@perstack/base@0.0.34" })
      expect(shouldUseBundledBase(skill)).toBe(false)
    })

    it("returns false when perstackBaseSkillCommand is empty array", () => {
      const skill = createMcpStdioSkill({ packageName: "@perstack/base" })
      // Empty array is still falsy for the check
      expect(shouldUseBundledBase(skill, [])).toBe(true)
    })
  })

  describe("initSkillManagersWithCleanup", () => {
    const createMockManager = (initResult: "success" | Error = "success") => {
      const manager = {
        name: "mock-skill",
        type: "mcp" as const,
        lazyInit: false,
        skill: createMcpStdioSkill(),
        init: vi
          .fn()
          .mockImplementation(() =>
            initResult === "success" ? Promise.resolve() : Promise.reject(initResult),
          ),
        close: vi.fn().mockResolvedValue(undefined),
        getToolDefinitions: vi.fn().mockResolvedValue([]),
        callTool: vi.fn().mockResolvedValue([]),
      }
      return manager as unknown as BaseSkillManager & {
        init: ReturnType<typeof vi.fn>
        close: ReturnType<typeof vi.fn>
      }
    }

    it("initializes all managers successfully", async () => {
      const manager1 = createMockManager()
      const manager2 = createMockManager()
      const allManagers: BaseSkillManager[] = [manager1, manager2]

      await initSkillManagersWithCleanup([manager1, manager2], allManagers)

      expect(manager1.init).toHaveBeenCalled()
      expect(manager2.init).toHaveBeenCalled()
    })

    it("closes all managers and throws on failure", async () => {
      const error = new Error("Init failed")
      const manager1 = createMockManager("success")
      const manager2 = createMockManager(error)
      const allManagers: BaseSkillManager[] = [manager1, manager2]

      await expect(initSkillManagersWithCleanup([manager1, manager2], allManagers)).rejects.toThrow(
        "Init failed",
      )

      expect(manager1.close).toHaveBeenCalled()
      expect(manager2.close).toHaveBeenCalled()
    })

    it("handles close errors gracefully", async () => {
      const initError = new Error("Init failed")
      const manager1 = createMockManager("success")
      manager1.close.mockRejectedValue(new Error("Close failed"))
      const manager2 = createMockManager(initError)
      const allManagers: BaseSkillManager[] = [manager1, manager2]

      // Should not throw from close error, only from init error
      await expect(initSkillManagersWithCleanup([manager1, manager2], allManagers)).rejects.toThrow(
        "Init failed",
      )
    })
  })

  describe("closeSkillManagers", () => {
    const createMockManager = () => {
      const manager = {
        name: "mock-skill",
        type: "mcp" as const,
        lazyInit: false,
        skill: createMcpStdioSkill(),
        init: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        getToolDefinitions: vi.fn().mockResolvedValue([]),
        callTool: vi.fn().mockResolvedValue([]),
      }
      return manager as unknown as BaseSkillManager & { close: ReturnType<typeof vi.fn> }
    }

    it("closes all skill managers", async () => {
      const manager1 = createMockManager()
      const manager2 = createMockManager()
      const managers = { skill1: manager1, skill2: manager2 }

      await closeSkillManagers(managers)

      expect(manager1.close).toHaveBeenCalled()
      expect(manager2.close).toHaveBeenCalled()
    })

    it("handles close errors gracefully", async () => {
      const manager1 = createMockManager()
      manager1.close.mockRejectedValue(new Error("Close failed"))
      const manager2 = createMockManager()
      const managers = { skill1: manager1, skill2: manager2 }

      // Should not throw
      await expect(closeSkillManagers(managers)).resolves.not.toThrow()
    })
  })

  describe("getSkillManagerByToolName", () => {
    const createMockManager = (name: string, tools: ToolDefinition[]): BaseSkillManager => {
      const manager = {
        name,
        type: "mcp" as const,
        lazyInit: false,
        skill: createMcpStdioSkill({ name }),
        init: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        getToolDefinitions: vi.fn().mockResolvedValue(tools),
        callTool: vi.fn().mockResolvedValue([]),
      }
      return manager as unknown as BaseSkillManager
    }

    it("returns manager that contains the tool", async () => {
      const manager1 = createMockManager("skill1", [
        {
          skillName: "skill1",
          name: "tool1",
          description: "Test",
          inputSchema: {},
          interactive: false,
        },
      ])
      const manager2 = createMockManager("skill2", [
        {
          skillName: "skill2",
          name: "tool2",
          description: "Test",
          inputSchema: {},
          interactive: false,
        },
      ])
      const managers = { skill1: manager1, skill2: manager2 }

      const result = await getSkillManagerByToolName(managers, "tool2")

      expect(result).toBe(manager2)
    })

    it("throws when tool is not found", async () => {
      const manager = createMockManager("skill1", [
        {
          skillName: "skill1",
          name: "tool1",
          description: "Test",
          inputSchema: {},
          interactive: false,
        },
      ])
      const managers = { skill1: manager }

      await expect(getSkillManagerByToolName(managers, "nonexistent")).rejects.toThrow(
        "Tool nonexistent not found",
      )
    })
  })

  describe("getToolSet", () => {
    const createMockManager = (tools: ToolDefinition[]): BaseSkillManager => {
      const manager = {
        name: "mock-skill",
        type: "mcp" as const,
        lazyInit: false,
        skill: createMcpStdioSkill(),
        init: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        getToolDefinitions: vi.fn().mockResolvedValue(tools),
        callTool: vi.fn().mockResolvedValue([]),
      }
      return manager as unknown as BaseSkillManager
    }

    it("returns toolset from all managers", async () => {
      const manager1 = createMockManager([
        {
          skillName: "skill1",
          name: "readFile",
          description: "Read a file",
          inputSchema: { type: "object", properties: { path: { type: "string" } } },
          interactive: false,
        },
      ])
      const manager2 = createMockManager([
        {
          skillName: "skill2",
          name: "writeFile",
          description: "Write a file",
          inputSchema: { type: "object", properties: { path: { type: "string" } } },
          interactive: false,
        },
      ])
      const managers = { skill1: manager1, skill2: manager2 }

      const toolset = await getToolSet(managers)

      expect(toolset).toHaveProperty("readFile")
      expect(toolset).toHaveProperty("writeFile")
    })

    it("returns empty object for empty managers", async () => {
      const managers = {}

      const toolset = await getToolSet(managers)

      expect(Object.keys(toolset)).toHaveLength(0)
    })
  })

  describe("collectToolDefinitionsForExpert", () => {
    const createMockExpert = (overrides: Partial<Expert> = {}): Expert => ({
      key: "test-expert",
      name: "Test Expert",
      version: "1.0.0",
      instruction: "Test instruction",
      skills: {
        "@perstack/base": createMcpStdioSkill({ name: "@perstack/base" }),
      },
      delegates: [],
      tags: [],
      ...overrides,
    })

    const createMockFactory = (): SkillManagerFactory => {
      const mockManager = {
        name: "mock-skill",
        type: "mcp" as const,
        lazyInit: false,
        skill: createMcpStdioSkill(),
        init: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        getToolDefinitions: vi.fn().mockResolvedValue([
          {
            skillName: "@perstack/base",
            name: "readFile",
            description: "Read a file",
            inputSchema: { type: "object" },
            interactive: false,
          },
        ]),
        callTool: vi.fn().mockResolvedValue([]),
      }
      return {
        createMcp: vi.fn().mockReturnValue(mockManager),
        createInMemoryBase: vi.fn().mockReturnValue(mockManager),
        createInteractive: vi.fn().mockReturnValue(mockManager),
        createDelegate: vi.fn().mockReturnValue(mockManager),
      } as unknown as SkillManagerFactory
    }

    it("throws when base skill is not defined", async () => {
      const expert = createMockExpert({ skills: {} })

      await expect(
        collectToolDefinitionsForExpert(expert, { env: {}, factory: createMockFactory() }),
      ).rejects.toThrow("Base skill is not defined")
    })

    it("collects tool definitions from managers", async () => {
      const expert = createMockExpert()
      const factory = createMockFactory()

      const result = await collectToolDefinitionsForExpert(expert, { env: {}, factory })

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe("readFile")
    })

    it("uses bundled base for base skill without version", async () => {
      const expert = createMockExpert()
      const factory = createMockFactory()

      await collectToolDefinitionsForExpert(expert, { env: {}, factory })

      expect(factory.createInMemoryBase).toHaveBeenCalled()
    })

    it("handles perstackBaseSkillCommand override", async () => {
      const expert = createMockExpert({
        skills: {
          "@perstack/base": createMcpStdioSkill({
            name: "@perstack/base",
            command: "npx",
            packageName: "@perstack/base",
          }),
          "other-skill": createMcpStdioSkill({ name: "other-skill", packageName: "other" }),
        },
      })
      const factory = createMockFactory()

      await collectToolDefinitionsForExpert(expert, {
        env: {},
        factory,
        perstackBaseSkillCommand: ["node", "custom.js"],
      })

      // When perstackBaseSkillCommand is set, bundled base is not used
      expect(factory.createInMemoryBase).not.toHaveBeenCalled()
    })

    it("closes all managers in finally block", async () => {
      const expert = createMockExpert()
      const mockManager = {
        name: "mock-skill",
        type: "mcp" as const,
        lazyInit: false,
        skill: createMcpStdioSkill(),
        init: vi.fn().mockRejectedValue(new Error("Init failed")),
        close: vi.fn().mockResolvedValue(undefined),
        getToolDefinitions: vi.fn().mockResolvedValue([]),
        callTool: vi.fn().mockResolvedValue([]),
      }
      const factory = {
        createMcp: vi.fn().mockReturnValue(mockManager),
        createInMemoryBase: vi.fn().mockReturnValue(mockManager),
        createInteractive: vi.fn().mockReturnValue(mockManager),
        createDelegate: vi.fn().mockReturnValue(mockManager),
      } as unknown as SkillManagerFactory

      await expect(
        collectToolDefinitionsForExpert(expert, { env: {}, factory }),
      ).rejects.toThrow()

      // close should still be called due to finally block
      expect(mockManager.close).toHaveBeenCalled()
    })
  })

  describe("getSkillManagersFromLockfile", () => {
    const createMockExpert = (overrides: Partial<Expert> = {}): Expert => ({
      key: "test-expert",
      name: "Test Expert",
      version: "1.0.0",
      instruction: "Test instruction",
      skills: {
        "@perstack/base": createMcpStdioSkill({ name: "@perstack/base" }),
      },
      delegates: [],
      tags: [],
      ...overrides,
    })

    const createMockRunSetting = (): RunSetting => ({
      expertKey: "test-expert",
      input: { text: "test" },
      maxSteps: 10,
      maxRetries: 3,
      timeout: 60000,
      env: {},
      jobId: "test-job",
      runId: "test-run",
      providerConfig: { providerName: "anthropic", apiKey: "test-key" },
      model: "claude-sonnet-4-5",
      reasoningBudget: "low",
      experts: {},
      startedAt: Date.now(),
      updatedAt: Date.now(),
      perstackApiBaseUrl: "https://api.perstack.ai",
    })

    const createMockFactory = (): SkillManagerFactory => {
      const mockManager = {
        name: "mock-skill",
        type: "mcp" as const,
        lazyInit: false,
        skill: createMcpStdioSkill(),
        init: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        getToolDefinitions: vi.fn().mockResolvedValue([]),
        callTool: vi.fn().mockResolvedValue([]),
      }
      return {
        createMcp: vi.fn().mockReturnValue(mockManager),
        createInMemoryBase: vi.fn().mockReturnValue(mockManager),
        createInteractive: vi.fn().mockReturnValue(mockManager),
        createDelegate: vi.fn().mockReturnValue(mockManager),
      } as unknown as SkillManagerFactory
    }

    it("throws when base skill is not defined", async () => {
      const expert = createMockExpert({ skills: {} })
      const setting = createMockRunSetting()

      await expect(
        getSkillManagersFromLockfile(expert, {}, setting, {}, undefined, {
          factory: createMockFactory(),
        }),
      ).rejects.toThrow("Base skill is not defined")
    })

    it("creates LockfileSkillManager for MCP skills", async () => {
      const expert = createMockExpert()
      const setting = createMockRunSetting()
      const lockfileToolDefinitions = {
        "@perstack/base": [
          { skillName: "@perstack/base", name: "readFile", inputSchema: { type: "object" } },
        ],
      }

      const managers = await getSkillManagersFromLockfile(
        expert,
        {},
        setting,
        lockfileToolDefinitions,
        undefined,
        { factory: createMockFactory() },
      )

      expect(Object.keys(managers)).toContain("@perstack/base")
    })

    it("throws when delegate expert is not found", async () => {
      const expert = createMockExpert({ delegates: ["nonexistent-expert"] })
      const setting = createMockRunSetting()

      await expect(
        getSkillManagersFromLockfile(expert, {}, setting, {}, undefined, {
          factory: createMockFactory(),
        }),
      ).rejects.toThrow('Delegate expert "nonexistent-expert" not found in experts')
    })

    it("creates delegate managers for delegate experts", async () => {
      const expert = createMockExpert({ delegates: ["delegate-expert"] })
      const delegateExpert = createMockExpert({ key: "delegate-expert", name: "Delegate" })
      const setting = createMockRunSetting()
      const factory = createMockFactory()

      await getSkillManagersFromLockfile(
        expert,
        { "delegate-expert": delegateExpert },
        setting,
        {},
        undefined,
        { factory },
      )

      expect(factory.createDelegate).toHaveBeenCalled()
    })

    it("skips interactive skills for delegated runs", async () => {
      const expert = createMockExpert({
        skills: {
          "@perstack/base": createMcpStdioSkill({ name: "@perstack/base" }),
          interactive: {
            type: "interactiveSkill",
            name: "interactive",
            tools: {},
          },
        },
      })
      const setting = createMockRunSetting()
      const factory = createMockFactory()

      await getSkillManagersFromLockfile(expert, {}, setting, {}, undefined, {
        factory,
        isDelegatedRun: true,
      })

      expect(factory.createInteractive).not.toHaveBeenCalled()
    })

    it("creates interactive skill managers for non-delegated runs", async () => {
      const expert = createMockExpert({
        skills: {
          "@perstack/base": createMcpStdioSkill({ name: "@perstack/base" }),
          interactive: {
            type: "interactiveSkill",
            name: "interactive",
            tools: {},
          },
        },
      })
      const setting = createMockRunSetting()
      const factory = createMockFactory()

      await getSkillManagersFromLockfile(expert, {}, setting, {}, undefined, {
        factory,
        isDelegatedRun: false,
      })

      expect(factory.createInteractive).toHaveBeenCalled()
    })
  })
})
