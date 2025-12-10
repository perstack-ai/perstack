import type { Expert, RunEvent, RuntimeEvent } from "@perstack/core"
import { describe, expect, it } from "vitest"
import { MockAdapter } from "./mock-adapter.js"

const createMockExpert = (): Expert => ({
  key: "test-expert",
  name: "Test Expert",
  version: "1.0.0",
  instruction: "Test instruction",
  skills: {},
  delegates: [],
  tags: [],
  runtime: ["perstack"],
})

const createBaseSetting = () => ({
  model: "test-model",
  providerConfig: { providerName: "anthropic" as const, apiKey: "test-key" },
  expertKey: "test-expert",
  input: { text: "test" },
})

describe("@perstack/runtime: MockAdapter", () => {
  it("has correct name from options", () => {
    const adapter = new MockAdapter({ name: "cursor" })
    expect(adapter.name).toBe("cursor")
  })

  describe("checkPrerequisites", () => {
    it("returns ok when shouldFail is false", async () => {
      const adapter = new MockAdapter({ name: "perstack" })
      const result = await adapter.checkPrerequisites()
      expect(result.ok).toBe(true)
    })

    it("returns error when shouldFail is true", async () => {
      const adapter = new MockAdapter({ name: "perstack", shouldFail: true })
      const result = await adapter.checkPrerequisites()
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.type).toBe("cli-not-found")
        expect(result.error.message).toBe("Mock failure")
      }
    })

    it("uses custom failure message", async () => {
      const adapter = new MockAdapter({
        name: "perstack",
        shouldFail: true,
        failureMessage: "Custom error",
      })
      const result = await adapter.checkPrerequisites()
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.message).toBe("Custom error")
      }
    })
  })

  describe("convertExpert", () => {
    it("returns instruction from expert", () => {
      const adapter = new MockAdapter({ name: "perstack" })
      const expert = createMockExpert()
      const config = adapter.convertExpert(expert)
      expect(config.instruction).toBe("Test instruction")
    })
  })

  describe("run", () => {
    it("throws error when expert not found", async () => {
      const adapter = new MockAdapter({ name: "perstack" })
      await expect(
        adapter.run({
          setting: { ...createBaseSetting(), expertKey: "nonexistent" },
        }),
      ).rejects.toThrow('Expert "nonexistent" not found')
    })

    it("emits initializeRuntime and completeRun events", async () => {
      const adapter = new MockAdapter({ name: "cursor", mockOutput: "Hello" })
      const events: (RunEvent | RuntimeEvent)[] = []
      const result = await adapter.run({
        setting: {
          ...createBaseSetting(),
          experts: { "test-expert": createMockExpert() },
        },
        eventListener: (e) => events.push(e),
      })
      expect(events).toHaveLength(2)
      expect(events[0].type).toBe("initializeRuntime")
      expect(events[1].type).toBe("completeRun")
      expect(result.checkpoint.status).toBe("completed")
      expect(result.checkpoint.metadata?.runtime).toBe("cursor")
    })

    it("uses custom mock output", async () => {
      const adapter = new MockAdapter({ name: "perstack", mockOutput: "Custom output" })
      const result = await adapter.run({
        setting: {
          ...createBaseSetting(),
          experts: { "test-expert": createMockExpert() },
        },
      })
      expect(result.checkpoint.messages[0].contents[0]).toMatchObject({
        type: "textPart",
        text: "Custom output",
      })
    })

    it("uses default output when mockOutput not provided", async () => {
      const adapter = new MockAdapter({ name: "gemini" })
      const result = await adapter.run({
        setting: {
          ...createBaseSetting(),
          experts: { "test-expert": createMockExpert() },
        },
      })
      expect(result.checkpoint.messages[0].contents[0]).toMatchObject({
        type: "textPart",
        text: "Mock output from gemini",
      })
    })

    it("uses provided jobId and runId", async () => {
      const adapter = new MockAdapter({ name: "perstack" })
      const result = await adapter.run({
        setting: {
          ...createBaseSetting(),
          jobId: "custom-job",
          runId: "custom-run",
          experts: { "test-expert": createMockExpert() },
        },
      })
      expect(result.checkpoint.jobId).toBe("custom-job")
      expect(result.checkpoint.runId).toBe("custom-run")
    })

    it("applies delay when specified", async () => {
      const adapter = new MockAdapter({ name: "perstack", delay: 50 })
      const start = Date.now()
      await adapter.run({
        setting: {
          ...createBaseSetting(),
          experts: { "test-expert": createMockExpert() },
        },
      })
      const elapsed = Date.now() - start
      expect(elapsed).toBeGreaterThanOrEqual(45)
    })
  })
})
