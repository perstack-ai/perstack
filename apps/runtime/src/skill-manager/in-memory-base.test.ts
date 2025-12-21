import { BASE_SKILL_NAME } from "@perstack/base"
import { describe, expect, it, vi } from "vitest"
import { InMemoryBaseSkillManager } from "./in-memory-base.js"

describe("@perstack/runtime: InMemoryBaseSkillManager", () => {
  describe("constructor", () => {
    it("creates manager with correct name", () => {
      const manager = new InMemoryBaseSkillManager("job-1", "run-1")
      expect(manager.name).toBe(BASE_SKILL_NAME)
    })

    it("creates manager with mcp type", () => {
      const manager = new InMemoryBaseSkillManager("job-1", "run-1")
      expect(manager.type).toBe("mcp")
    })

    it("creates manager with lazyInit false", () => {
      const manager = new InMemoryBaseSkillManager("job-1", "run-1")
      expect(manager.lazyInit).toBe(false)
    })
  })

  describe("init", () => {
    it("emits skillConnected event on successful init", async () => {
      const eventListener = vi.fn()
      const manager = new InMemoryBaseSkillManager("job-1", "run-1", eventListener)

      await manager.init()

      expect(eventListener).toHaveBeenCalled()
      const event = eventListener.mock.calls[0][0]
      expect(event.type).toBe("skillConnected")
      expect(event.skillName).toBe(BASE_SKILL_NAME)
      expect(event.spawnDurationMs).toBe(0) // No process spawn for in-memory
    })

    it("sets initialized state after init", async () => {
      const manager = new InMemoryBaseSkillManager("job-1", "run-1")

      expect(manager.isInitialized()).toBe(false)
      await manager.init()
      expect(manager.isInitialized()).toBe(true)
    })
  })

  describe("getToolDefinitions", () => {
    it("returns tool definitions after init", async () => {
      const manager = new InMemoryBaseSkillManager("job-1", "run-1")
      await manager.init()

      const tools = await manager.getToolDefinitions()

      expect(Array.isArray(tools)).toBe(true)
      expect(tools.length).toBeGreaterThan(0)
      // Check for expected base skill tools
      const toolNames = tools.map((t) => t.name)
      expect(toolNames).toContain("think")
      expect(toolNames).toContain("exec")
      expect(toolNames).toContain("readTextFile")
    })

    it("all tools have skillName set to @perstack/base", async () => {
      const manager = new InMemoryBaseSkillManager("job-1", "run-1")
      await manager.init()

      const tools = await manager.getToolDefinitions()

      for (const tool of tools) {
        expect(tool.skillName).toBe(BASE_SKILL_NAME)
      }
    })
  })

  describe("callTool", () => {
    it("throws error if not initialized", async () => {
      const manager = new InMemoryBaseSkillManager("job-1", "run-1")

      await expect(manager.callTool("think", { thought: "test" })).rejects.toThrow(
        "@perstack/base is not initialized",
      )
    })

    it("can call think tool after init", async () => {
      const manager = new InMemoryBaseSkillManager("job-1", "run-1")
      await manager.init()

      const result = await manager.callTool("think", {
        thought: "test thought",
        nextThoughtNeeded: false,
      })

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
    })

    it("can call healthCheck tool after init", async () => {
      const manager = new InMemoryBaseSkillManager("job-1", "run-1")
      await manager.init()

      const result = await manager.callTool("healthCheck", {})

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe("close", () => {
    it("emits skillDisconnected event on close", async () => {
      const eventListener = vi.fn()
      const manager = new InMemoryBaseSkillManager("job-1", "run-1", eventListener)
      await manager.init()
      eventListener.mockClear()

      await manager.close()

      expect(eventListener).toHaveBeenCalled()
      const event = eventListener.mock.calls[0][0]
      expect(event.type).toBe("skillDisconnected")
      expect(event.skillName).toBe(BASE_SKILL_NAME)
    })

    it("does not throw when closing without init", async () => {
      const manager = new InMemoryBaseSkillManager("job-1", "run-1")

      await expect(manager.close()).resolves.toBeUndefined()
    })
  })
})
