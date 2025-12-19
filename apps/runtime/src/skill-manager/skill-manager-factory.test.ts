import type { Expert, InteractiveSkill, McpStdioSkill } from "@perstack/core"
import { describe, expect, it, vi } from "vitest"
import { DelegateSkillManager } from "./delegate.js"
import { InteractiveSkillManager } from "./interactive.js"
import { McpSkillManager } from "./mcp.js"
import { DefaultSkillManagerFactory, defaultSkillManagerFactory } from "./skill-manager-factory.js"

function createMcpSkill(overrides: Partial<McpStdioSkill> = {}): McpStdioSkill {
  return {
    type: "mcpStdioSkill",
    name: "test-mcp-skill",
    command: "npx",
    args: ["@example/pkg"],
    requiredEnv: [],
    pick: [],
    omit: [],
    lazyInit: true,
    ...overrides,
  } as McpStdioSkill
}

function createInteractiveSkill(overrides: Partial<InteractiveSkill> = {}): InteractiveSkill {
  return {
    type: "interactiveSkill",
    name: "test-interactive-skill",
    description: "Test interactive skill",
    tools: {
      "test-tool": {
        name: "test-tool",
        description: "Test tool",
        inputJsonSchema: JSON.stringify({ type: "object" }),
      },
    },
    ...overrides,
  }
}

function createExpert(overrides: Partial<Expert> = {}): Expert {
  return {
    key: "test-expert",
    name: "@test/expert",
    version: "1.0.0",
    description: "Test expert",
    instruction: "Test instruction",
    skills: {},
    delegates: [],
    tags: [],
    ...overrides,
  }
}

const factoryContext = {
  env: {},
  jobId: "test-job-id",
  runId: "test-run-id",
}

describe("@perstack/runtime: DefaultSkillManagerFactory", () => {
  describe("createMcp", () => {
    it("creates McpSkillManager", () => {
      const factory = new DefaultSkillManagerFactory()
      const skill = createMcpSkill()

      const manager = factory.createMcp(skill, factoryContext)

      expect(manager).toBeInstanceOf(McpSkillManager)
      expect(manager.name).toBe("test-mcp-skill")
    })

    it("passes environment variables to manager", () => {
      const factory = new DefaultSkillManagerFactory()
      const skill = createMcpSkill()
      const context = { ...factoryContext, env: { API_KEY: "secret" } }

      const manager = factory.createMcp(skill, context)

      expect(manager).toBeInstanceOf(McpSkillManager)
    })

    it("passes event listener to manager", () => {
      const factory = new DefaultSkillManagerFactory()
      const skill = createMcpSkill()
      const eventListener = vi.fn()
      const context = { ...factoryContext, eventListener }

      const manager = factory.createMcp(skill, context)

      expect(manager).toBeInstanceOf(McpSkillManager)
    })
  })

  describe("createInteractive", () => {
    it("creates InteractiveSkillManager", () => {
      const factory = new DefaultSkillManagerFactory()
      const skill = createInteractiveSkill()

      const manager = factory.createInteractive(skill, factoryContext)

      expect(manager).toBeInstanceOf(InteractiveSkillManager)
      expect(manager.name).toBe("test-interactive-skill")
    })

    it("passes job and run IDs correctly", () => {
      const factory = new DefaultSkillManagerFactory()
      const skill = createInteractiveSkill()
      const context = { ...factoryContext, jobId: "custom-job", runId: "custom-run" }

      const manager = factory.createInteractive(skill, context)

      expect(manager).toBeInstanceOf(InteractiveSkillManager)
    })
  })

  describe("createDelegate", () => {
    it("creates DelegateSkillManager", () => {
      const factory = new DefaultSkillManagerFactory()
      const expert = createExpert()

      const manager = factory.createDelegate(expert, factoryContext)

      expect(manager).toBeInstanceOf(DelegateSkillManager)
      expect(manager.name).toBe("@test/expert")
    })

    it("uses expert name as manager name", () => {
      const factory = new DefaultSkillManagerFactory()
      const expert = createExpert({ name: "@custom/delegate-expert" })

      const manager = factory.createDelegate(expert, factoryContext)

      expect(manager.name).toBe("@custom/delegate-expert")
    })
  })
})

describe("@perstack/runtime: defaultSkillManagerFactory", () => {
  it("is an instance of DefaultSkillManagerFactory", () => {
    expect(defaultSkillManagerFactory).toBeInstanceOf(DefaultSkillManagerFactory)
  })

  it("has createMcp method", () => {
    expect(typeof defaultSkillManagerFactory.createMcp).toBe("function")
  })

  it("has createInteractive method", () => {
    expect(typeof defaultSkillManagerFactory.createInteractive).toBe("function")
  })

  it("has createDelegate method", () => {
    expect(typeof defaultSkillManagerFactory.createDelegate).toBe("function")
  })
})
