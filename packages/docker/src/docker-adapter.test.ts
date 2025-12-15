import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import type { ExecResult } from "@perstack/core"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DockerAdapter } from "./docker-adapter.js"

class TestableDockerAdapter extends DockerAdapter {
  public mockExecCommand: ((args: string[]) => Promise<ExecResult>) | null = null
  protected override async execCommand(args: string[]): Promise<ExecResult> {
    if (this.mockExecCommand) {
      return this.mockExecCommand(args)
    }
    return super.execCommand(args)
  }
  public testResolveWorkspacePath(workspace?: string): string | undefined {
    return this.resolveWorkspacePath(workspace)
  }
  public async testPrepareBuildContext(
    config: Parameters<DockerAdapter["prepareBuildContext"]>[0],
    expertKey: string,
    workspace?: string,
  ): Promise<string> {
    return this.prepareBuildContext(config, expertKey, workspace)
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
    it("should throw error when config is not provided", async () => {
      const adapter = new DockerAdapter()
      const params = {
        setting: {
          expertKey: "test",
          input: { text: "hello" },
        },
      }
      await expect(adapter.run(params as never)).rejects.toThrow(
        "DockerAdapter requires config in AdapterRunParams",
      )
    })
  })
  describe("resolveWorkspacePath", () => {
    let tempDir: string
    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "perstack-test-"))
    })
    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true })
    })
    it("should return undefined when workspace is not provided", () => {
      const adapter = new TestableDockerAdapter()
      expect(adapter.testResolveWorkspacePath()).toBeUndefined()
      expect(adapter.testResolveWorkspacePath(undefined)).toBeUndefined()
    })
    it("should resolve absolute path that exists", () => {
      const adapter = new TestableDockerAdapter()
      const result = adapter.testResolveWorkspacePath(tempDir)
      expect(result).toBe(tempDir)
    })
    it("should resolve relative path to absolute path", () => {
      const adapter = new TestableDockerAdapter()
      const result = adapter.testResolveWorkspacePath(".")
      expect(result).toBe(process.cwd())
    })
    it("should throw error when path does not exist", () => {
      const adapter = new TestableDockerAdapter()
      expect(() => adapter.testResolveWorkspacePath("/nonexistent/path")).toThrow(
        "Workspace path does not exist",
      )
    })
    it("should throw error when path is not a directory", () => {
      const adapter = new TestableDockerAdapter()
      const testFile = path.join(tempDir, "test.txt")
      fs.writeFileSync(testFile, "test")
      expect(() => adapter.testResolveWorkspacePath(testFile)).toThrow(
        "Workspace path is not a directory",
      )
    })
  })
  describe("prepareBuildContext", () => {
    const minimalConfig = {
      model: "test-model",
      provider: { providerName: "anthropic" as const },
      experts: {
        "test-expert": {
          key: "test-expert",
          name: "Test Expert",
          version: "1.0.0",
          description: "Test expert",
          instruction: "You are a test expert",
          skills: {},
          delegates: [],
          tags: [],
        },
      },
    }
    let buildDir: string | null = null
    afterEach(() => {
      if (buildDir) {
        fs.rmSync(buildDir, { recursive: true, force: true })
        buildDir = null
      }
    })
    it("should create workspace directory when workspace is not provided", async () => {
      const adapter = new TestableDockerAdapter()
      buildDir = await adapter.testPrepareBuildContext(minimalConfig, "test-expert")
      expect(fs.existsSync(path.join(buildDir, "workspace"))).toBe(true)
    })
    it("should not create workspace directory when workspace is provided", async () => {
      const adapter = new TestableDockerAdapter()
      const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "test-workspace-"))
      try {
        buildDir = await adapter.testPrepareBuildContext(
          minimalConfig,
          "test-expert",
          tempWorkspace,
        )
        expect(fs.existsSync(path.join(buildDir, "workspace"))).toBe(false)
      } finally {
        fs.rmSync(tempWorkspace, { recursive: true, force: true })
      }
    })
    it("should generate compose file with workspace path", async () => {
      const adapter = new TestableDockerAdapter()
      const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "test-workspace-"))
      try {
        buildDir = await adapter.testPrepareBuildContext(
          minimalConfig,
          "test-expert",
          tempWorkspace,
        )
        const composeContent = fs.readFileSync(path.join(buildDir, "docker-compose.yml"), "utf-8")
        expect(composeContent).toContain(tempWorkspace)
      } finally {
        fs.rmSync(tempWorkspace, { recursive: true, force: true })
      }
    })
  })
})
