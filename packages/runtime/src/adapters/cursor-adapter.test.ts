import type { Expert, RunEvent, RuntimeEvent } from "@perstack/core"
import { describe, expect, it } from "vitest"
import { CursorAdapter } from "./cursor-adapter.js"

const createMockExpert = (): Expert => ({
  key: "test-expert",
  name: "Test Expert",
  version: "1.0.0",
  instruction: "Test instruction",
  skills: {},
  delegates: [],
  tags: [],
  runtime: ["cursor"],
})

const createBaseSetting = () => ({
  model: "test-model",
  providerConfig: { providerName: "anthropic" as const, apiKey: "test-key" },
  expertKey: "test-expert",
  input: { text: "test query" },
})

class TestableCursorAdapter extends CursorAdapter {
  mockResult = { stdout: "Mock output", stderr: "", exitCode: 0, finalOutput: "Mock output" }

  protected override async executeCursorAgentStreaming(): Promise<{
    stdout: string
    stderr: string
    exitCode: number
    finalOutput: string
  }> {
    return this.mockResult
  }
}

describe("CursorAdapter", () => {
  it("has correct name", () => {
    const adapter = new CursorAdapter()
    expect(adapter.name).toBe("cursor")
  })

  describe("convertExpert", () => {
    it("returns instruction unchanged", () => {
      const adapter = new CursorAdapter()
      const expert: Expert = {
        key: "test",
        name: "test",
        version: "1.0.0",
        instruction: "Test instruction",
        skills: {},
        delegates: [],
        tags: [],
        runtime: ["cursor"],
      }
      const config = adapter.convertExpert(expert)
      expect(config.instruction).toBe("Test instruction")
    })
  })

  describe("checkPrerequisites", () => {
    it("fails when cursor-agent not installed", async () => {
      const adapter = new CursorAdapter()
      const result = await adapter.checkPrerequisites()
      if (!result.ok) {
        expect(result.error.type).toBe("cli-not-found")
        expect(result.error.helpUrl).toBeDefined()
      }
    })
  })

  describe("run", () => {
    it("emits events and returns checkpoint on success", async () => {
      const adapter = new TestableCursorAdapter()
      adapter.mockResult = {
        stdout: "Success output",
        stderr: "",
        exitCode: 0,
        finalOutput: "Success output",
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
      expect(result.checkpoint.metadata?.runtime).toBe("cursor")
    })

    it("throws error when expert not found", async () => {
      const adapter = new TestableCursorAdapter()
      await expect(
        adapter.run({
          setting: { ...createBaseSetting(), expertKey: "nonexistent" },
        }),
      ).rejects.toThrow('Expert "nonexistent" not found')
    })

    it("throws error when CLI fails", async () => {
      const adapter = new TestableCursorAdapter()
      adapter.mockResult = { stdout: "", stderr: "Error", exitCode: 1, finalOutput: "" }
      await expect(
        adapter.run({
          setting: {
            ...createBaseSetting(),
            experts: { "test-expert": createMockExpert() },
          },
        }),
      ).rejects.toThrow("Cursor CLI failed with exit code 1")
    })
  })
})
