import type { Expert, RunEvent, RuntimeEvent } from "@perstack/core"
import { describe, expect, it } from "vitest"
import { ClaudeCodeAdapter } from "./claude-code-adapter.js"

const createMockExpert = (): Expert => ({
  key: "test-expert",
  name: "Test Expert",
  version: "1.0.0",
  instruction: "Test instruction",
  skills: {},
  delegates: [],
  tags: [],
  runtime: ["claude-code"],
})

const createBaseSetting = () => ({
  model: "test-model",
  providerConfig: { providerName: "anthropic" as const, apiKey: "test-key" },
  expertKey: "test-expert",
  input: { text: "test query" },
})

class TestableClaudeCodeAdapter extends ClaudeCodeAdapter {
  mockResult = { stdout: "Mock output", stderr: "", exitCode: 0 }

  protected override async executeClaudeCliStreaming(): Promise<{
    stdout: string
    stderr: string
    exitCode: number
  }> {
    return this.mockResult
  }
}

describe("ClaudeCodeAdapter", () => {
  it("has correct name", () => {
    const adapter = new ClaudeCodeAdapter()
    expect(adapter.name).toBe("claude-code")
  })

  describe("convertExpert", () => {
    it("returns instruction unchanged", () => {
      const adapter = new ClaudeCodeAdapter()
      const expert: Expert = {
        key: "test",
        name: "test",
        version: "1.0.0",
        instruction: "Test instruction",
        skills: {},
        delegates: [],
        tags: [],
        runtime: ["claude-code"],
      }
      const config = adapter.convertExpert(expert)
      expect(config.instruction).toBe("Test instruction")
    })
  })

  describe("checkPrerequisites", () => {
    it("fails when claude CLI not installed", async () => {
      const adapter = new ClaudeCodeAdapter()
      const result = await adapter.checkPrerequisites()
      if (!result.ok) {
        expect(result.error.type).toBe("cli-not-found")
        expect(result.error.helpUrl).toBeDefined()
      }
    })
  })

  describe("run", () => {
    it("emits events and returns checkpoint on success", async () => {
      const adapter = new TestableClaudeCodeAdapter()
      adapter.mockResult = {
        stdout: '{"type":"result","content":"Success output"}',
        stderr: "",
        exitCode: 0,
      }
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
      expect(result.checkpoint.metadata?.runtime).toBe("claude-code")
    })

    it("throws error when expert not found", async () => {
      const adapter = new TestableClaudeCodeAdapter()
      await expect(
        adapter.run({
          setting: { ...createBaseSetting(), expertKey: "nonexistent" },
        }),
      ).rejects.toThrow('Expert "nonexistent" not found')
    })

    it("throws error when CLI fails", async () => {
      const adapter = new TestableClaudeCodeAdapter()
      adapter.mockResult = { stdout: "", stderr: "Error", exitCode: 1 }
      await expect(
        adapter.run({
          setting: {
            ...createBaseSetting(),
            experts: { "test-expert": createMockExpert() },
          },
        }),
      ).rejects.toThrow("Claude Code CLI failed with exit code 1")
    })
  })
})
