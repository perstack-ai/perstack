import type { ExecResult } from "@perstack/core"
import { describe, expect, it, vi } from "vitest"
import { DockerAdapter } from "./docker-adapter.js"

class TestableDockerAdapter extends DockerAdapter {
  public mockExecCommand: ((args: string[]) => Promise<ExecResult>) | null = null
  protected override async execCommand(args: string[]): Promise<ExecResult> {
    if (this.mockExecCommand) {
      return this.mockExecCommand(args)
    }
    return super.execCommand(args)
  }
}

describe("DockerAdapter", () => {
  describe("name", () => {
    it("should have name 'docker'", () => {
      const adapter = new DockerAdapter()
      expect(adapter.name).toBe("docker")
    })
  })

  describe("checkPrerequisites", () => {
    it("should return ok when docker is available and daemon is running", async () => {
      const adapter = new TestableDockerAdapter()
      adapter.mockExecCommand = vi.fn(async (args: string[]) => {
        if (args[0] === "docker" && args[1] === "--version") {
          return { stdout: "Docker version 24.0.0, build abc123", stderr: "", exitCode: 0 }
        }
        if (args[0] === "docker" && args[1] === "info") {
          return { stdout: "Server Version: 24.0.0", stderr: "", exitCode: 0 }
        }
        return { stdout: "", stderr: "", exitCode: 1 }
      })
      const result = await adapter.checkPrerequisites()
      expect(result.ok).toBe(true)
    })

    it("should return error when docker CLI is not found", async () => {
      const adapter = new TestableDockerAdapter()
      adapter.mockExecCommand = vi.fn(async () => {
        throw new Error("not found")
      })
      const result = await adapter.checkPrerequisites()
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.type).toBe("cli-not-found")
        expect(result.error.message).toContain("Docker CLI")
      }
    })

    it("should return error when docker daemon is not running", async () => {
      const adapter = new TestableDockerAdapter()
      adapter.mockExecCommand = vi.fn(async (args: string[]) => {
        if (args[0] === "docker" && args[1] === "--version") {
          return { stdout: "Docker version 24.0.0", stderr: "", exitCode: 0 }
        }
        if (args[0] === "docker" && args[1] === "info") {
          return { stdout: "", stderr: "Cannot connect to Docker daemon", exitCode: 1 }
        }
        return { stdout: "", stderr: "", exitCode: 1 }
      })
      const result = await adapter.checkPrerequisites()
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.message).toContain("daemon")
      }
    })
  })

  describe("convertExpert", () => {
    it("should extract instruction from expert", () => {
      const adapter = new DockerAdapter()
      const expert = {
        key: "test-expert",
        name: "Test Expert",
        version: "1.0.0",
        instruction: "You are a test expert.",
        skills: {},
        delegates: [],
        tags: [],
      }
      const config = adapter.convertExpert(expert)
      expect(config.instruction).toBe("You are a test expert.")
    })
  })

  describe("run", () => {
    it("should throw not implemented error", async () => {
      const adapter = new DockerAdapter()
      await expect(adapter.run({} as never)).rejects.toThrow("not yet implemented")
    })
  })
})
