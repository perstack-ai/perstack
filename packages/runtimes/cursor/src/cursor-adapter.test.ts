import type { ChildProcess } from "node:child_process"
import { spawn } from "node:child_process"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { CursorAdapter } from "./cursor-adapter.js"

vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
}))

const mockSpawn = vi.mocked(spawn)

function createMockProcess(): ChildProcess {
  return {
    stdin: { end: vi.fn() },
    stdout: {
      on: vi.fn((event, cb) => {
        if (event === "data") {
          cb(`${JSON.stringify({ type: "result", result: "done" })}\n`)
        }
      }),
    },
    stderr: { on: vi.fn() },
    on: vi.fn((event, cb) => {
      if (event === "close") cb(0)
    }),
    kill: vi.fn(),
  } as unknown as ChildProcess
}

describe("CursorAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("environment variable isolation", () => {
    it("should not pass any API keys to spawned process", async () => {
      const originalEnv = { ...process.env }
      process.env.ANTHROPIC_API_KEY = "sk-ant-test-key"
      process.env.GEMINI_API_KEY = "gemini-test-key"
      process.env.OPENAI_API_KEY = "sk-openai-test-key"
      mockSpawn.mockReturnValue(createMockProcess())

      const adapter = new CursorAdapter()
      try {
        await adapter.run({
          setting: {
            model: "claude-sonnet-4-5",
            providerConfig: { providerName: "anthropic", apiKey: "test-key" },
            jobId: "test-job",
            runId: "test-run",
            expertKey: "test-expert",
            experts: {
              "test-expert": {
                name: "Test Expert",
                version: "1.0.0",
                instruction: "Test instruction",
              },
            },
            input: { text: "test query" },
          },
          eventListener: vi.fn(),
          storeCheckpoint: vi.fn(),
        })
      } catch {
        // Expected: mock doesn't fully simulate the process
      }

      expect(mockSpawn).toHaveBeenCalled()
      const spawnCall = mockSpawn.mock.calls[0]
      const envArg = spawnCall[2]?.env as Record<string, string> | undefined
      expect(envArg).toBeDefined()
      expect(envArg?.ANTHROPIC_API_KEY).toBeUndefined()
      expect(envArg?.GEMINI_API_KEY).toBeUndefined()
      expect(envArg?.OPENAI_API_KEY).toBeUndefined()

      process.env = originalEnv
    })
  })
})
