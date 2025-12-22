import { EventEmitter } from "node:events"
import type { Expert, RunEvent } from "@perstack/core"
import { describe, expect, it, vi } from "vitest"
import { PerstackAdapter } from "./perstack-adapter.js"

type ExecCommandResult = { exitCode: number; stdout: string; stderr: string }

function createMockProcess() {
  const stdout = new EventEmitter()
  const stderr = new EventEmitter()
  const proc = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter
    stderr: EventEmitter
    stdin: { end: () => void }
    kill: () => void
  }
  proc.stdout = stdout
  proc.stderr = stderr
  proc.stdin = { end: vi.fn() }
  proc.kill = vi.fn()
  return proc
}

describe("@perstack/runtime: PerstackAdapter", () => {
  describe("Direct execution mode (default)", () => {
    it("has correct name", () => {
      const adapter = new PerstackAdapter()
      expect(adapter.name).toBe("local")
    })

    it("prerequisites always pass in direct execution mode", async () => {
      const adapter = new PerstackAdapter({ useDirectExecution: true })
      const result = await adapter.checkPrerequisites()
      expect(result.ok).toBe(true)
    })

    it("convertExpert returns instruction unchanged", () => {
      const adapter = new PerstackAdapter()
      const expert: Expert = {
        key: "test",
        name: "test",
        version: "1.0.0",
        instruction: "Test instruction",
        skills: {},
        delegates: [],
        tags: [],
      }
      const config = adapter.convertExpert(expert)
      expect(config.instruction).toBe("Test instruction")
    })
  })

  describe("CLI execution mode", () => {
    it("prerequisites fail when CLI is not available", async () => {
      const adapter = new PerstackAdapter({ useDirectExecution: false })
      const adapterAny = adapter as unknown as { execCommand: () => Promise<ExecCommandResult> }
      vi.spyOn(adapterAny, "execCommand").mockResolvedValue({
        exitCode: 127,
        stdout: "",
        stderr: "command not found",
      })
      const result = await adapter.checkPrerequisites()
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error?.type).toBe("cli-not-found")
      }
    })

    it("prerequisites pass when CLI is available", async () => {
      const adapter = new PerstackAdapter({ useDirectExecution: false })
      const adapterAny = adapter as unknown as { execCommand: () => Promise<ExecCommandResult> }
      vi.spyOn(adapterAny, "execCommand").mockResolvedValue({
        exitCode: 0,
        stdout: "1.0.0\n",
        stderr: "",
      })
      const result = await adapter.checkPrerequisites()
      expect(result.ok).toBe(true)
    })

    it("prerequisites fail when execCommand throws", async () => {
      const adapter = new PerstackAdapter({ useDirectExecution: false })
      const adapterAny = adapter as unknown as { execCommand: () => Promise<ExecCommandResult> }
      vi.spyOn(adapterAny, "execCommand").mockRejectedValue(new Error("spawn failed"))
      const result = await adapter.checkPrerequisites()
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error?.type).toBe("cli-not-found")
      }
    })

    it("buildCliArgs constructs correct arguments", () => {
      const adapter = new PerstackAdapter({ useDirectExecution: false })
      type SettingArg = {
        jobId?: string
        runId?: string
        expertKey: string
        maxSteps?: number
        maxRetries?: number
        timeout?: number
        input: { text?: string }
        providerConfig: { providerName: "anthropic" }
        model: string
      }
      const adapterAny = adapter as unknown as { buildCliArgs: (s: SettingArg) => string[] }
      const setting: SettingArg = {
        jobId: "job-123",
        runId: "run-456",
        expertKey: "test-expert",
        maxSteps: 10,
        maxRetries: 3,
        timeout: 30000,
        input: { text: "test query" },
        providerConfig: { providerName: "anthropic" },
        model: "claude-sonnet-4-5",
      }
      const args = adapterAny.buildCliArgs(setting)
      expect(args).toContain("run")
      expect(args).toContain("--job-id")
      expect(args).toContain("job-123")
      expect(args).toContain("--run-id")
      expect(args).toContain("run-456")
      expect(args).toContain("--max-steps")
      expect(args).toContain("10")
      expect(args).toContain("--max-retries")
      expect(args).toContain("3")
      expect(args).toContain("--timeout")
      expect(args).toContain("30000")
      expect(args).toContain("--model")
      expect(args).toContain("claude-sonnet-4-5")
      expect(args).toContain("--provider")
      expect(args).toContain("anthropic")
      expect(args).toContain("test-expert")
      expect(args).toContain("test query")
    })

    it("buildCliArgs handles minimal settings", () => {
      const adapter = new PerstackAdapter({ useDirectExecution: false })
      type SettingArg = {
        expertKey: string
        input: { text?: string }
        providerConfig: { providerName: "anthropic" }
        model: string
      }
      const adapterAny = adapter as unknown as { buildCliArgs: (s: SettingArg) => string[] }
      const setting: SettingArg = {
        expertKey: "test-expert",
        input: {},
        providerConfig: { providerName: "anthropic" },
        model: "claude-sonnet-4-5",
      }
      const args = adapterAny.buildCliArgs(setting)
      expect(args).toEqual([
        "run",
        "--model",
        "claude-sonnet-4-5",
        "--provider",
        "anthropic",
        "test-expert",
        "",
      ])
    })

    describe("runViaCli", () => {
      it("throws error when CLI exits with non-zero code", async () => {
        const adapter = new PerstackAdapter({ useDirectExecution: false })
        type AdapterAny = {
          executeRuntimeCli: () => Promise<ExecCommandResult>
          runViaCli: (params: { setting: unknown; eventListener?: unknown }) => Promise<unknown>
        }
        const adapterAny = adapter as unknown as AdapterAny
        vi.spyOn(adapterAny, "executeRuntimeCli").mockResolvedValue({
          exitCode: 1,
          stdout: "",
          stderr: "error",
        })
        const setting = {
          expertKey: "test",
          input: { text: "query" },
          providerConfig: { providerName: "anthropic" },
          model: "claude-sonnet-4-5",
        }
        await expect(adapterAny.runViaCli({ setting })).rejects.toThrow(
          "perstack-runtime CLI failed with exit code 1",
        )
      })

      it("throws error when no terminal event received", async () => {
        const adapter = new PerstackAdapter({ useDirectExecution: false })
        type AdapterAny = {
          executeRuntimeCli: (
            args: string[],
            timeout: number,
            listener: (e: RunEvent) => void,
          ) => Promise<ExecCommandResult>
          runViaCli: (params: { setting: unknown; eventListener?: unknown }) => Promise<unknown>
        }
        const adapterAny = adapter as unknown as AdapterAny
        vi.spyOn(adapterAny, "executeRuntimeCli").mockImplementation(
          async (_args, _timeout, listener) => {
            listener({ type: "startRun" } as RunEvent)
            return { exitCode: 0, stdout: "", stderr: "" }
          },
        )
        const setting = {
          expertKey: "test",
          input: { text: "query" },
          providerConfig: { providerName: "anthropic" },
          model: "claude-sonnet-4-5",
        }
        await expect(adapterAny.runViaCli({ setting })).rejects.toThrow(
          "No terminal event with checkpoint received from CLI",
        )
      })

      it("returns checkpoint from completeRun event", async () => {
        const adapter = new PerstackAdapter({ useDirectExecution: false })
        type AdapterAny = {
          executeRuntimeCli: (
            args: string[],
            timeout: number,
            listener: (e: RunEvent) => void,
          ) => Promise<ExecCommandResult>
          runViaCli: (params: { setting: unknown; eventListener?: unknown }) => Promise<unknown>
        }
        const adapterAny = adapter as unknown as AdapterAny
        const mockCheckpoint = { id: "cp-123", status: "completed" }
        vi.spyOn(adapterAny, "executeRuntimeCli").mockImplementation(
          async (_args, _timeout, listener) => {
            listener({ type: "startRun" } as RunEvent)
            listener({ type: "completeRun", checkpoint: mockCheckpoint } as unknown as RunEvent)
            return { exitCode: 0, stdout: "", stderr: "" }
          },
        )
        const setting = {
          expertKey: "test",
          input: { text: "query" },
          providerConfig: { providerName: "anthropic" },
          model: "claude-sonnet-4-5",
        }
        const result = (await adapterAny.runViaCli({ setting })) as {
          checkpoint: typeof mockCheckpoint
        }
        expect(result.checkpoint).toEqual(mockCheckpoint)
      })

      it("returns checkpoint from stopRunByDelegate event", async () => {
        const adapter = new PerstackAdapter({ useDirectExecution: false })
        type AdapterAny = {
          executeRuntimeCli: (
            args: string[],
            timeout: number,
            listener: (e: RunEvent) => void,
          ) => Promise<ExecCommandResult>
          runViaCli: (params: { setting: unknown; eventListener?: unknown }) => Promise<unknown>
        }
        const adapterAny = adapter as unknown as AdapterAny
        const mockCheckpoint = { id: "cp-456", status: "stoppedByDelegate" }
        vi.spyOn(adapterAny, "executeRuntimeCli").mockImplementation(
          async (_args, _timeout, listener) => {
            listener({
              type: "stopRunByDelegate",
              checkpoint: mockCheckpoint,
            } as unknown as RunEvent)
            return { exitCode: 0, stdout: "", stderr: "" }
          },
        )
        const setting = {
          expertKey: "test",
          input: { text: "query" },
          providerConfig: { providerName: "anthropic" },
          model: "claude-sonnet-4-5",
        }
        const result = (await adapterAny.runViaCli({ setting })) as {
          checkpoint: typeof mockCheckpoint
        }
        expect(result.checkpoint).toEqual(mockCheckpoint)
      })
    })

    describe("executeWithStreaming", () => {
      it("parses JSON events from stdout", async () => {
        const adapter = new PerstackAdapter({ useDirectExecution: false })
        type AdapterAny = {
          executeWithStreaming: (
            proc: ReturnType<typeof createMockProcess>,
            timeout: number,
            listener: (e: RunEvent) => void,
          ) => Promise<ExecCommandResult>
        }
        const adapterAny = adapter as unknown as AdapterAny
        const proc = createMockProcess()
        const events: RunEvent[] = []
        const promise = adapterAny.executeWithStreaming(proc, 60000, (e) => events.push(e))
        proc.stdout.emit("data", '{"type":"startRun"}\n{"type":"callTools"}\n')
        proc.emit("close", 0)
        const result = await promise
        expect(result.exitCode).toBe(0)
        expect(events).toHaveLength(2)
        expect(events[0].type).toBe("startRun")
        expect(events[1].type).toBe("callTools")
      })

      it("handles buffered partial lines", async () => {
        const adapter = new PerstackAdapter({ useDirectExecution: false })
        type AdapterAny = {
          executeWithStreaming: (
            proc: ReturnType<typeof createMockProcess>,
            timeout: number,
            listener: (e: RunEvent) => void,
          ) => Promise<ExecCommandResult>
        }
        const adapterAny = adapter as unknown as AdapterAny
        const proc = createMockProcess()
        const events: RunEvent[] = []
        const promise = adapterAny.executeWithStreaming(proc, 60000, (e) => events.push(e))
        proc.stdout.emit("data", '{"type":"sta')
        proc.stdout.emit("data", 'rtRun"}\n')
        proc.emit("close", 0)
        const result = await promise
        expect(result.exitCode).toBe(0)
        expect(events).toHaveLength(1)
        expect(events[0].type).toBe("startRun")
      })

      it("ignores non-JSON lines", async () => {
        const adapter = new PerstackAdapter({ useDirectExecution: false })
        type AdapterAny = {
          executeWithStreaming: (
            proc: ReturnType<typeof createMockProcess>,
            timeout: number,
            listener: (e: RunEvent) => void,
          ) => Promise<ExecCommandResult>
        }
        const adapterAny = adapter as unknown as AdapterAny
        const proc = createMockProcess()
        const events: RunEvent[] = []
        const promise = adapterAny.executeWithStreaming(proc, 60000, (e) => events.push(e))
        proc.stdout.emit("data", 'not json\n{"type":"startRun"}\nalso not json\n')
        proc.emit("close", 0)
        await promise
        expect(events).toHaveLength(1)
        expect(events[0].type).toBe("startRun")
      })

      it("captures stderr output", async () => {
        const adapter = new PerstackAdapter({ useDirectExecution: false })
        type AdapterAny = {
          executeWithStreaming: (
            proc: ReturnType<typeof createMockProcess>,
            timeout: number,
            listener: (e: RunEvent) => void,
          ) => Promise<ExecCommandResult>
        }
        const adapterAny = adapter as unknown as AdapterAny
        const proc = createMockProcess()
        const promise = adapterAny.executeWithStreaming(proc, 60000, () => {})
        proc.stderr.emit("data", "error message")
        proc.emit("close", 1)
        const result = await promise
        expect(result.stderr).toBe("error message")
        expect(result.exitCode).toBe(1)
      })

      it("rejects on process error", async () => {
        const adapter = new PerstackAdapter({ useDirectExecution: false })
        type AdapterAny = {
          executeWithStreaming: (
            proc: ReturnType<typeof createMockProcess>,
            timeout: number,
            listener: (e: RunEvent) => void,
          ) => Promise<ExecCommandResult>
        }
        const adapterAny = adapter as unknown as AdapterAny
        const proc = createMockProcess()
        const promise = adapterAny.executeWithStreaming(proc, 60000, () => {})
        proc.emit("error", new Error("spawn failed"))
        await expect(promise).rejects.toThrow("spawn failed")
      })

      it("rejects on timeout", async () => {
        vi.useFakeTimers()
        const adapter = new PerstackAdapter({ useDirectExecution: false })
        type AdapterAny = {
          executeWithStreaming: (
            proc: ReturnType<typeof createMockProcess>,
            timeout: number,
            listener: (e: RunEvent) => void,
          ) => Promise<ExecCommandResult>
        }
        const adapterAny = adapter as unknown as AdapterAny
        const proc = createMockProcess()
        const promise = adapterAny.executeWithStreaming(proc, 1000, () => {})
        vi.advanceTimersByTime(1001)
        await expect(promise).rejects.toThrow("perstack-runtime timed out after 1000ms")
        expect(proc.kill).toHaveBeenCalled()
        vi.useRealTimers()
      })
    })
  })
})
