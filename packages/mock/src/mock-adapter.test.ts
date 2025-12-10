import type { Expert, RunParamsInput, RunSetting } from "@perstack/core"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { MockAdapter } from "./mock-adapter.js"

function createTestSetting(overrides: Partial<RunSetting> = {}): RunParamsInput["setting"] {
  const expert: Expert = {
    key: "test-expert",
    name: "Test Expert",
    version: "1.0.0",
    instruction: "Test instruction",
    delegates: [],
    skills: {},
    model: "claude-sonnet-4-20250514",
    modelSettings: {},
    providerConfig: { providerName: "anthropic" },
    contextWindow: 100000,
  }
  return {
    jobId: "test-job",
    runId: "test-run",
    expertKey: "test-expert",
    experts: { "test-expert": expert },
    input: { text: "Test input" },
    ...overrides,
  }
}

describe("MockAdapter", () => {
  describe("constructor", () => {
    it("should set the name from options", () => {
      const adapter = new MockAdapter({ name: "cursor" })
      expect(adapter.name).toBe("cursor")
    })
  })

  describe("checkPrerequisites", () => {
    it("should return ok when shouldFail is false", async () => {
      const adapter = new MockAdapter({ name: "cursor" })
      const result = await adapter.checkPrerequisites()
      expect(result).toEqual({ ok: true })
    })

    it("should return error when shouldFail is true", async () => {
      const adapter = new MockAdapter({ name: "cursor", shouldFail: true })
      const result = await adapter.checkPrerequisites()
      expect(result).toEqual({
        ok: false,
        error: { type: "cli-not-found", message: "Mock failure" },
      })
    })

    it("should use custom failure message when provided", async () => {
      const adapter = new MockAdapter({
        name: "cursor",
        shouldFail: true,
        failureMessage: "Custom error",
      })
      const result = await adapter.checkPrerequisites()
      expect(result).toEqual({
        ok: false,
        error: { type: "cli-not-found", message: "Custom error" },
      })
    })
  })

  describe("convertExpert", () => {
    it("should return instruction from expert", () => {
      const adapter = new MockAdapter({ name: "cursor" })
      const expert: Expert = {
        key: "test",
        name: "Test",
        version: "1.0.0",
        instruction: "Test instruction",
        delegates: [],
        skills: {},
        model: "claude-sonnet-4-20250514",
        modelSettings: {},
        providerConfig: { providerName: "anthropic" },
        contextWindow: 100000,
      }
      const result = adapter.convertExpert(expert)
      expect(result).toEqual({ instruction: "Test instruction" })
    })
  })

  describe("run", () => {
    let eventListener: ReturnType<typeof vi.fn>

    beforeEach(() => {
      eventListener = vi.fn()
    })

    it("should emit init and complete events", async () => {
      const adapter = new MockAdapter({ name: "cursor" })
      const setting = createTestSetting()
      await adapter.run({ setting, eventListener })
      expect(eventListener).toHaveBeenCalledTimes(2)
      const [initEvent, completeEvent] = eventListener.mock.calls.map((c) => c[0])
      expect(initEvent.type).toBe("initializeRuntime")
      expect(completeEvent.type).toBe("completeRun")
    })

    it("should use custom mock output when provided", async () => {
      const adapter = new MockAdapter({ name: "cursor", mockOutput: "Custom output" })
      const setting = createTestSetting()
      const result = await adapter.run({ setting, eventListener })
      const lastMessage = result.checkpoint.messages[result.checkpoint.messages.length - 1]
      expect(lastMessage?.type).toBe("expertMessage")
      if (lastMessage?.type === "expertMessage") {
        const textPart = lastMessage.contents.find((c) => c.type === "textPart")
        expect(textPart?.type === "textPart" && textPart.text).toBe("Custom output")
      }
    })

    it("should respect delay option", async () => {
      const adapter = new MockAdapter({ name: "cursor", delay: 50 })
      const setting = createTestSetting()
      const start = Date.now()
      await adapter.run({ setting, eventListener })
      const elapsed = Date.now() - start
      expect(elapsed).toBeGreaterThanOrEqual(45)
    })

    it("should throw error when expert not found", async () => {
      const adapter = new MockAdapter({ name: "cursor" })
      const setting = createTestSetting({ experts: {} })
      await expect(adapter.run({ setting, eventListener })).rejects.toThrow(
        'Expert "test-expert" not found',
      )
    })

    it("should return checkpoint with correct structure", async () => {
      const adapter = new MockAdapter({ name: "cursor" })
      const setting = createTestSetting()
      const result = await adapter.run({ setting, eventListener })
      expect(result.checkpoint).toMatchObject({
        jobId: "test-job",
        runId: "test-run",
        status: "completed",
      })
      expect(result.checkpoint.messages.length).toBeGreaterThanOrEqual(1)
    })

    it("should include events in result", async () => {
      const adapter = new MockAdapter({ name: "cursor" })
      const setting = createTestSetting()
      const result = await adapter.run({ setting, eventListener })
      expect(result.events).toHaveLength(2)
      expect(result.events[0].type).toBe("initializeRuntime")
      expect(result.events[1].type).toBe("completeRun")
    })
  })
})
