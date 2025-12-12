import type { Expert } from "@perstack/core"
import { describe, expect, it, vi } from "vitest"
import { PerstackAdapter } from "./perstack-adapter.js"

describe("@perstack/runtime: PerstackAdapter", () => {
  describe("Direct execution mode (default)", () => {
    it("has correct name", () => {
      const adapter = new PerstackAdapter()
      expect(adapter.name).toBe("perstack")
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
      vi.spyOn(adapter as never, "execCommand").mockResolvedValue({
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
      vi.spyOn(adapter as never, "execCommand").mockResolvedValue({
        exitCode: 0,
        stdout: "1.0.0\n",
        stderr: "",
      })
      const result = await adapter.checkPrerequisites()
      expect(result.ok).toBe(true)
    })

    it("prerequisites fail when execCommand throws", async () => {
      const adapter = new PerstackAdapter({ useDirectExecution: false })
      vi.spyOn(adapter as never, "execCommand").mockRejectedValue(new Error("spawn failed"))
      const result = await adapter.checkPrerequisites()
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error?.type).toBe("cli-not-found")
      }
    })

    it("buildCliArgs constructs correct arguments", () => {
      const adapter = new PerstackAdapter({ useDirectExecution: false })
      const setting = {
        jobId: "job-123",
        runId: "run-456",
        expertKey: "test-expert",
        maxSteps: 10,
        maxRetries: 3,
        timeout: 30000,
        temperature: 0.5,
        input: { text: "test query" },
        providerConfig: { providerName: "anthropic" as const },
        model: "claude-sonnet-4-5",
      }
      const args = (adapter as never)["buildCliArgs"](setting) as string[]
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
      expect(args).toContain("--temperature")
      expect(args).toContain("0.5")
      expect(args).toContain("test-expert")
      expect(args).toContain("test query")
    })

    it("buildCliArgs handles minimal settings", () => {
      const adapter = new PerstackAdapter({ useDirectExecution: false })
      const setting = {
        expertKey: "test-expert",
        input: {},
        providerConfig: { providerName: "anthropic" as const },
        model: "claude-sonnet-4-5",
      }
      const args = (adapter as never)["buildCliArgs"](setting) as string[]
      expect(args).toEqual(["run", "test-expert", ""])
    })
  })
})
