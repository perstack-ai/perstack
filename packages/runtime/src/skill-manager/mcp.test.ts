import type { RunEvent, RuntimeEvent, ToolDefinition } from "@perstack/core"
import { describe, expect, it, vi } from "vitest"

// Mock the MCP SDK
vi.mock("@modelcontextprotocol/sdk/client/index.js", () => {
  const mockClient = vi.fn()
  mockClient.prototype.listTools = vi.fn().mockResolvedValue({ tools: [] })
  mockClient.prototype.connect = vi.fn().mockResolvedValue(undefined)
  mockClient.prototype.close = vi.fn().mockResolvedValue(undefined)
  return { Client: mockClient }
})

import { McpSkillManager } from "./mcp.js"

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

  it("awaits initialization when getToolDefinitions called while lazyInit in progress", async () => {
    const skill = createMcpSkill()
    const skillManager = new McpSkillManager(skill, {}, testJobId, testRunId)
    const sm = skillManager as unknown as McpSkillManagerInternal
    vi.spyOn(sm, "_doInit").mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            sm._toolDefinitions = [
              {
                name: "lazy-tool",
                skillName: "test-skill",
                inputSchema: {},
                interactive: false,
              },
            ]
            resolve(undefined)
          }, 10)
        }),
    )
    await skillManager.init()
    expect(skillManager.isInitialized()).toBe(false)
    // getToolDefinitions should wait for initialization to complete
    const tools = await skillManager.getToolDefinitions()
    expect(skillManager.isInitialized()).toBe(true)
    expect(tools).toHaveLength(1)
    expect(tools[0].name).toBe("lazy-tool")
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

  it("throws error from getToolDefinitions when init not called", async () => {
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

  it("accepts event listener in constructor", () => {
    const skill = createMcpSkill({ lazyInit: false })
    const events: (RunEvent | RuntimeEvent)[] = []
    const eventListener = (event: RunEvent | RuntimeEvent) => {
      events.push(event)
    }
    const skillManager = new McpSkillManager(skill, {}, testJobId, testRunId, eventListener)
    expect(skillManager).toBeDefined()
    expect(skillManager.name).toBe("test-skill")
  })

  it("emits skillConnected event with timing metrics when _doInit completes", async () => {
    const skill = createMcpSkill({ lazyInit: false })
    const events: RuntimeEvent[] = []
    const eventListener = (event: RunEvent | RuntimeEvent) => {
      if ("type" in event && event.type === "skillConnected") {
        events.push(event as RuntimeEvent)
      }
    }
    const skillManager = new McpSkillManager(skill, {}, testJobId, testRunId, eventListener)
    const sm = skillManager as unknown as McpSkillManagerInternal & {
      _initStdio: () => Promise<{
        startTime: number
        spawnDurationMs: number
        handshakeDurationMs: number
        serverInfo?: { name: string; version: string }
      }>
    }

    // Mock _initStdio to return timing info (this allows _doInit to run its real logic)
    vi.spyOn(sm, "_initStdio").mockResolvedValue({
      startTime: Date.now() - 1000,
      spawnDurationMs: 10,
      handshakeDurationMs: 500,
      serverInfo: { name: "test-server", version: "1.0.0" },
    })

    await skillManager.init()

    expect(events).toHaveLength(1)
    const event = events[0]
    expect(event.type).toBe("skillConnected")
    if (event.type === "skillConnected") {
      expect(event.skillName).toBe("test-skill")
      expect(event.spawnDurationMs).toBe(10)
      expect(event.handshakeDurationMs).toBe(500)
      expect(event.connectDurationMs).toBe(510)
      expect(event.serverInfo).toEqual({ name: "test-server", version: "1.0.0" })
      expect(typeof event.toolDiscoveryDurationMs).toBe("number")
      expect(typeof event.totalDurationMs).toBe("number")
    }
  })

  it("does not emit skillConnected with timing for SSE skills (no timingInfo)", async () => {
    const skill = {
      type: "mcpSseSkill" as const,
      name: "sse-skill",
      endpoint: "https://example.com/sse",
      pick: [],
      omit: [],
    }
    const events: RuntimeEvent[] = []
    const eventListener = (event: RunEvent | RuntimeEvent) => {
      if ("type" in event && event.type === "skillConnected") {
        events.push(event as RuntimeEvent)
      }
    }
    const skillManager = new McpSkillManager(skill, {}, testJobId, testRunId, eventListener)
    const sm = skillManager as unknown as McpSkillManagerInternal & {
      _initSse: () => Promise<void>
    }

    // Mock _initSse (SSE skills don't return timing info)
    vi.spyOn(sm, "_initSse").mockResolvedValue(undefined)

    await skillManager.init()

    // SSE skills don't emit skillConnected with timing because timingInfo is undefined
    expect(events).toHaveLength(0)
  })
})
