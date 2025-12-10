import type { Expert, RunEvent, RuntimeEvent } from "@perstack/core"
import { describe, expect, it } from "vitest"
import { GeminiAdapter } from "./gemini-adapter.js"

const createMockExpert = (): Expert => ({
  key: "test-expert",
  name: "Test Expert",
  version: "1.0.0",
  instruction: "Test instruction",
  skills: {},
  delegates: [],
  tags: [],
  runtime: ["gemini"],
})

const createBaseSetting = () => ({
  model: "test-model",
  providerConfig: { providerName: "anthropic" as const, apiKey: "test-key" },
  expertKey: "test-expert",
  input: { text: "test query" },
})

class TestableGeminiAdapter extends GeminiAdapter {
  mockResult = { stdout: "Mock output", stderr: "", exitCode: 0 }

  protected override async executeGeminiCli(): Promise<{
    stdout: string
    stderr: string
    exitCode: number
  }> {
    return this.mockResult
  }
}

describe("GeminiAdapter", () => {
  it("has correct name", () => {
    const adapter = new GeminiAdapter()
    expect(adapter.name).toBe("gemini")
  })

  describe("convertExpert", () => {
    it("returns instruction unchanged", () => {
      const adapter = new GeminiAdapter()
      const expert: Expert = {
        key: "test",
        name: "test",
        version: "1.0.0",
        instruction: "Test instruction",
        skills: {},
        delegates: [],
        tags: [],
        runtime: ["gemini"],
      }
      const config = adapter.convertExpert(expert)
      expect(config.instruction).toBe("Test instruction")
    })
  })

  describe("checkPrerequisites", () => {
    it("fails when gemini CLI not installed or API key missing", async () => {
      const originalKey = process.env.GEMINI_API_KEY
      delete process.env.GEMINI_API_KEY
      const adapter = new GeminiAdapter()
      const result = await adapter.checkPrerequisites()
      if (originalKey) process.env.GEMINI_API_KEY = originalKey
      if (!result.ok) {
        expect(result.error.type).toMatch(/cli-not-found|auth-missing/)
        expect(result.error.helpUrl).toBeDefined()
      }
    })
  })

  describe("run", () => {
    it("emits events and returns checkpoint on success", async () => {
      const adapter = new TestableGeminiAdapter()
      adapter.mockResult = { stdout: "Success output", stderr: "", exitCode: 0 }
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
      expect(result.checkpoint.metadata?.runtime).toBe("gemini")
    })

    it("throws error when expert not found", async () => {
      const adapter = new TestableGeminiAdapter()
      await expect(
        adapter.run({
          setting: { ...createBaseSetting(), expertKey: "nonexistent" },
        }),
      ).rejects.toThrow('Expert "nonexistent" not found')
    })

    it("throws error when CLI fails", async () => {
      const adapter = new TestableGeminiAdapter()
      adapter.mockResult = { stdout: "", stderr: "Error", exitCode: 1 }
      await expect(
        adapter.run({
          setting: {
            ...createBaseSetting(),
            experts: { "test-expert": createMockExpert() },
          },
        }),
      ).rejects.toThrow("Gemini CLI failed with exit code 1")
    })
  })
})
