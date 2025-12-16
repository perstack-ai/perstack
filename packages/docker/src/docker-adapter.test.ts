import type { ChildProcess, SpawnOptions } from "node:child_process"
import { EventEmitter } from "node:events"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import type { ExecResult, RunEvent, RuntimeEvent } from "@perstack/core"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DockerAdapter } from "./docker-adapter.js"
import { parseBuildOutputLine, parseProxyLogLine } from "./output-parser.js"

type MockProcess = ChildProcess & {
  stdout: EventEmitter
  stderr: EventEmitter
  stdin: { end: () => void }
}

function createMockProcess(): MockProcess {
  const proc = new EventEmitter() as MockProcess
  proc.stdout = new EventEmitter()
  proc.stderr = new EventEmitter()
  proc.stdin = { end: vi.fn() }
  proc.kill = vi.fn()
  return proc
}

function findContainerStatusEvent(
  events: Array<RunEvent | RuntimeEvent>,
  status: string,
  service: string,
): (RunEvent | RuntimeEvent) | undefined {
  return events.find(
    (e) =>
      "type" in e &&
      e.type === "dockerContainerStatus" &&
      "status" in e &&
      e.status === status &&
      "service" in e &&
      e.service === service,
  )
}

function createEventCollector() {
  const events: Array<RunEvent | RuntimeEvent> = []
  const listener = (event: RunEvent | RuntimeEvent) => events.push(event)
  return { events, listener }
}

function setupMockProcess(adapter: TestableDockerAdapter) {
  const mockProc = createMockProcess()
  adapter.mockCreateProcess = () => mockProc
  return mockProc
}

class TestableDockerAdapter extends DockerAdapter {
  public mockExecCommand: ((args: string[]) => Promise<ExecResult>) | null = null
  public mockExecCommandWithOutput: ((args: string[]) => Promise<number>) | null = null
  public mockCreateProcess: (() => ChildProcess) | null = null
  public capturedBuildArgs: string[] = []

  protected override async execCommand(args: string[]): Promise<ExecResult> {
    if (this.mockExecCommand) {
      return this.mockExecCommand(args)
    }
    return super.execCommand(args)
  }

  protected override execCommandWithOutput(args: string[]): Promise<number> {
    this.capturedBuildArgs = args
    if (this.mockExecCommandWithOutput) {
      return this.mockExecCommandWithOutput(args)
    }
    return super.execCommandWithOutput(args)
  }

  protected override createProcess(
    command: string,
    args: string[],
    options: SpawnOptions,
  ): ChildProcess {
    if (this.mockCreateProcess) {
      return this.mockCreateProcess()
    }
    return super.createProcess(command, args, options)
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

  public async testBuildImages(buildDir: string, verbose?: boolean): Promise<void> {
    return this.buildImages(buildDir, verbose)
  }

  public testExecCommandWithOutput(args: string[]): Promise<number> {
    return super.execCommandWithOutput(args)
  }

  public testExecCommandWithBuildProgress(
    args: string[],
    jobId: string,
    runId: string,
    eventListener: (event: RunEvent | RuntimeEvent) => void,
  ): Promise<number> {
    return this.execCommandWithBuildProgress(args, jobId, runId, eventListener)
  }

  public testStartProxyLogStream(
    composeFile: string,
    jobId: string,
    runId: string,
    eventListener: (event: RunEvent | RuntimeEvent) => void,
  ): ChildProcess {
    return this.startProxyLogStream(composeFile, jobId, runId, eventListener)
  }

  public async testRunContainer(
    buildDir: string,
    cliArgs: string[],
    envVars: Record<string, string>,
    timeout: number,
    verbose: boolean | undefined,
    jobId: string,
    runId: string,
    eventListener: (event: RunEvent | RuntimeEvent) => void,
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return this.runContainer(
      buildDir,
      cliArgs,
      envVars,
      timeout,
      verbose,
      jobId,
      runId,
      eventListener,
    )
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

    it("should normalize absolute path with parent directory references", () => {
      const adapter = new TestableDockerAdapter()
      const result = adapter.testResolveWorkspacePath(
        path.join(tempDir, "..", path.basename(tempDir)),
      )
      expect(result).toBe(tempDir)
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

  describe("buildImages", () => {
    let tempDir: string
    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "perstack-build-test-"))
      fs.writeFileSync(path.join(tempDir, "docker-compose.yml"), "version: '3'")
    })
    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true })
    })

    it("should use execCommand without verbose flag", async () => {
      const adapter = new TestableDockerAdapter()
      let capturedArgs: string[] = []
      adapter.mockExecCommand = vi.fn(async (args: string[]) => {
        capturedArgs = args
        return { stdout: "", stderr: "", exitCode: 0 }
      })
      await adapter.testBuildImages(tempDir, false)
      expect(capturedArgs).toContain("docker")
      expect(capturedArgs).toContain("compose")
      expect(capturedArgs).toContain("build")
      expect(capturedArgs).not.toContain("--progress=plain")
    })

    it("should use execCommandWithOutput with verbose flag", async () => {
      const adapter = new TestableDockerAdapter()
      adapter.mockExecCommandWithOutput = vi.fn(async () => 0)
      await adapter.testBuildImages(tempDir, true)
      expect(adapter.capturedBuildArgs).toContain("docker")
      expect(adapter.capturedBuildArgs).toContain("compose")
      expect(adapter.capturedBuildArgs).toContain("build")
      expect(adapter.capturedBuildArgs).toContain("--progress=plain")
    })

    it("should throw error when build fails without verbose", async () => {
      const adapter = new TestableDockerAdapter()
      adapter.mockExecCommand = vi.fn(async () => ({
        stdout: "",
        stderr: "build error",
        exitCode: 1,
      }))
      await expect(adapter.testBuildImages(tempDir, false)).rejects.toThrow(
        "Docker build failed: build error",
      )
    })

    it("should throw error when build fails with verbose", async () => {
      const adapter = new TestableDockerAdapter()
      adapter.mockExecCommandWithOutput = vi.fn(async () => 1)
      await expect(adapter.testBuildImages(tempDir, true)).rejects.toThrow(
        "Docker build failed with exit code 1",
      )
    })
  })

  describe("execCommandWithOutput", () => {
    it("should return exit code 0 for successful command", async () => {
      const adapter = new TestableDockerAdapter()
      const exitCode = await adapter.testExecCommandWithOutput(["true"])
      expect(exitCode).toBe(0)
    })

    it("should return non-zero exit code for failed command", async () => {
      const adapter = new TestableDockerAdapter()
      const exitCode = await adapter.testExecCommandWithOutput(["false"])
      expect(exitCode).not.toBe(0)
    })

    it("should return 127 for empty command", async () => {
      const adapter = new TestableDockerAdapter()
      const exitCode = await adapter.testExecCommandWithOutput([])
      expect(exitCode).toBe(127)
    })

    it("should return 127 for non-existent command", async () => {
      const adapter = new TestableDockerAdapter()
      const exitCode = await adapter.testExecCommandWithOutput(["nonexistent-command-xyz"])
      expect(exitCode).toBe(127)
    })
  })

  describe("parseProxyLogLine", () => {
    it.each([
      {
        name: "allowed CONNECT with TCP_TUNNEL",
        input: "proxy-1  | 1734567890.123 TCP_TUNNEL/200 CONNECT api.anthropic.com:443",
        expected: { action: "allowed", domain: "api.anthropic.com", port: 443 },
      },
      {
        name: "allowed CONNECT with HIER_DIRECT",
        input: "proxy-1  | 1734567890.123 HIER_DIRECT/200 CONNECT api.openai.com:443",
        expected: { action: "allowed", domain: "api.openai.com", port: 443 },
      },
      {
        name: "blocked CONNECT request",
        input: "proxy-1  | 1734567890.123 TCP_DENIED/403 CONNECT blocked.com:443",
        expected: {
          action: "blocked",
          domain: "blocked.com",
          port: 443,
          reason: "Domain not in allowlist",
        },
      },
      {
        name: "log line without container prefix",
        input: "1734567890.123 TCP_TUNNEL/200 CONNECT api.anthropic.com:443",
        expected: { action: "allowed", domain: "api.anthropic.com", port: 443 },
      },
      {
        name: "blocked with /403 status",
        input: "1734567890.123 HIER_NONE/403 CONNECT evil.com:443",
        expected: {
          action: "blocked",
          domain: "evil.com",
          port: 443,
          reason: "Domain not in allowlist",
        },
      },
    ])("should parse $name", ({ input, expected }) => {
      expect(parseProxyLogLine(input)).toEqual(expected)
    })

    it.each([
      {
        name: "non-CONNECT requests",
        input: "proxy-1  | 1734567890.123 TCP_MISS/200 GET http://example.com/",
      },
      { name: "unrecognized log format", input: "some random log line" },
    ])("should return null for $name", ({ input }) => {
      expect(parseProxyLogLine(input)).toBeNull()
    })
  })

  describe("parseBuildOutputLine", () => {
    it.each([
      {
        name: "standard build output as building stage",
        input: "Step 1/5 : FROM node:22-slim",
        expected: {
          stage: "building",
          service: "runtime",
          message: "Step 1/5 : FROM node:22-slim",
        },
      },
      {
        name: "pulling stage from 'Pulling'",
        input: "Pulling from library/node",
        expected: { stage: "pulling", service: "runtime", message: "Pulling from library/node" },
      },
      {
        name: "pulling stage from 'pull'",
        input: "digest: sha256:abc123 pull complete",
        expected: {
          stage: "pulling",
          service: "runtime",
          message: "digest: sha256:abc123 pull complete",
        },
      },
      {
        name: "buildkit format with runtime service",
        input: "#5 [runtime 1/5] FROM node:22-slim",
        expected: {
          stage: "building",
          service: "runtime",
          message: "#5 [runtime 1/5] FROM node:22-slim",
        },
      },
      {
        name: "buildkit format with proxy service",
        input: "#3 [proxy 2/3] RUN apt-get update",
        expected: {
          stage: "building",
          service: "proxy",
          message: "#3 [proxy 2/3] RUN apt-get update",
        },
      },
      {
        name: "npm install output",
        input: "added 150 packages in 10s",
        expected: { stage: "building", service: "runtime", message: "added 150 packages in 10s" },
      },
    ])("should parse $name", ({ input, expected }) => {
      expect(parseBuildOutputLine(input)).toEqual(expected)
    })

    it.each([
      { name: "empty line", input: "" },
      { name: "whitespace-only line", input: "   " },
    ])("should return null for $name", ({ input }) => {
      expect(parseBuildOutputLine(input)).toBeNull()
    })
  })

  describe("execCommandWithBuildProgress", () => {
    it("should return 127 for empty command", async () => {
      const adapter = new TestableDockerAdapter()
      const exitCode = await adapter.testExecCommandWithBuildProgress(
        [],
        "job-1",
        "run-1",
        () => {},
      )
      expect(exitCode).toBe(127)
    })

    it("should emit dockerBuildProgress events from stdout", async () => {
      const adapter = new TestableDockerAdapter()
      const { events, listener } = createEventCollector()
      const mockProc = setupMockProcess(adapter)
      const resultPromise = adapter.testExecCommandWithBuildProgress(
        ["docker", "compose", "build"],
        "job-1",
        "run-1",
        listener,
      )
      mockProc.stdout.emit("data", Buffer.from("#5 [runtime 1/5] FROM node:22-slim\n"))
      mockProc.emit("close", 0)
      const exitCode = await resultPromise
      expect(exitCode).toBe(0)
      expect(events.length).toBe(1)
      expect(events[0]).toMatchObject({
        type: "dockerBuildProgress",
        stage: "building",
        service: "runtime",
        message: "#5 [runtime 1/5] FROM node:22-slim",
      })
    })

    it("should emit pulling stage for pull output", async () => {
      const adapter = new TestableDockerAdapter()
      const { events, listener } = createEventCollector()
      const mockProc = setupMockProcess(adapter)
      const resultPromise = adapter.testExecCommandWithBuildProgress(
        ["docker", "compose", "build"],
        "job-1",
        "run-1",
        listener,
      )
      mockProc.stdout.emit("data", Buffer.from("Pulling from library/node\n"))
      mockProc.emit("close", 0)
      await resultPromise
      expect(events[0]).toMatchObject({ stage: "pulling" })
    })

    it("should handle stderr output", async () => {
      const adapter = new TestableDockerAdapter()
      const { events, listener } = createEventCollector()
      const mockProc = setupMockProcess(adapter)
      const resultPromise = adapter.testExecCommandWithBuildProgress(
        ["docker", "compose", "build"],
        "job-1",
        "run-1",
        listener,
      )
      mockProc.stderr.emit("data", Buffer.from("Building step 1\n"))
      mockProc.emit("close", 0)
      await resultPromise
      expect(events.length).toBe(1)
    })

    it("should handle multiline output", async () => {
      const adapter = new TestableDockerAdapter()
      const { events, listener } = createEventCollector()
      const mockProc = setupMockProcess(adapter)
      const resultPromise = adapter.testExecCommandWithBuildProgress(
        ["docker", "compose", "build"],
        "job-1",
        "run-1",
        listener,
      )
      mockProc.stdout.emit("data", Buffer.from("Line1\nLine2\nLine3\n"))
      mockProc.emit("close", 0)
      await resultPromise
      expect(events.length).toBe(3)
    })

    it("should handle buffered output with trailing content", async () => {
      const adapter = new TestableDockerAdapter()
      const { events, listener } = createEventCollector()
      const mockProc = setupMockProcess(adapter)
      const resultPromise = adapter.testExecCommandWithBuildProgress(
        ["docker", "compose", "build"],
        "job-1",
        "run-1",
        listener,
      )
      mockProc.stdout.emit("data", Buffer.from("NoNewline"))
      mockProc.emit("close", 0)
      await resultPromise
      expect(events.length).toBe(1)
      expect(events[0]).toMatchObject({ message: "NoNewline" })
    })

    it("should handle error event", async () => {
      const adapter = new TestableDockerAdapter()
      const mockProc = setupMockProcess(adapter)
      const resultPromise = adapter.testExecCommandWithBuildProgress(
        ["docker", "compose", "build"],
        "job-1",
        "run-1",
        () => {},
      )
      mockProc.emit("error", new Error("spawn error"))
      const exitCode = await resultPromise
      expect(exitCode).toBe(127)
    })
  })

  describe("startProxyLogStream with mock spawn", () => {
    it("should emit proxyAccess events for allowed CONNECT requests", async () => {
      const adapter = new TestableDockerAdapter()
      const { events, listener } = createEventCollector()
      const mockProc = setupMockProcess(adapter)
      adapter.testStartProxyLogStream("/tmp/docker-compose.yml", "job-1", "run-1", listener)
      mockProc.stdout.emit(
        "data",
        Buffer.from("proxy-1  | 1734567890.123 TCP_TUNNEL/200 CONNECT api.anthropic.com:443\n"),
      )
      await new Promise((r) => setTimeout(r, 10))
      expect(events.length).toBe(1)
      expect(events[0]).toMatchObject({
        type: "proxyAccess",
        action: "allowed",
        domain: "api.anthropic.com",
        port: 443,
      })
    })

    it("should emit proxyAccess events for blocked requests", async () => {
      const adapter = new TestableDockerAdapter()
      const { events, listener } = createEventCollector()
      const mockProc = setupMockProcess(adapter)
      adapter.testStartProxyLogStream("/tmp/docker-compose.yml", "job-1", "run-1", listener)
      mockProc.stdout.emit(
        "data",
        Buffer.from("proxy-1  | 1734567890.123 TCP_DENIED/403 CONNECT blocked.com:443\n"),
      )
      await new Promise((r) => setTimeout(r, 10))
      expect(events.length).toBe(1)
      expect(events[0]).toMatchObject({
        action: "blocked",
        domain: "blocked.com",
        reason: "Domain not in allowlist",
      })
    })

    it("should handle stderr output for proxy logs", async () => {
      const adapter = new TestableDockerAdapter()
      const { events, listener } = createEventCollector()
      const mockProc = setupMockProcess(adapter)
      adapter.testStartProxyLogStream("/tmp/docker-compose.yml", "job-1", "run-1", listener)
      mockProc.stderr.emit(
        "data",
        Buffer.from("1734567890.123 TCP_TUNNEL/200 CONNECT stderr-test.com:443\n"),
      )
      await new Promise((r) => setTimeout(r, 10))
      expect(events.length).toBe(1)
      expect(events[0]).toMatchObject({ domain: "stderr-test.com" })
    })

    it("should ignore non-CONNECT log lines", async () => {
      const adapter = new TestableDockerAdapter()
      const { events, listener } = createEventCollector()
      const mockProc = setupMockProcess(adapter)
      adapter.testStartProxyLogStream("/tmp/docker-compose.yml", "job-1", "run-1", listener)
      mockProc.stdout.emit("data", Buffer.from("some random log line\n"))
      mockProc.stdout.emit("data", Buffer.from("TCP_MISS/200 GET http://example.com/\n"))
      await new Promise((r) => setTimeout(r, 10))
      expect(events.length).toBe(0)
    })
  })

  describe("runContainer verbose mode events", () => {
    let tempDir: string

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "perstack-run-test-"))
      fs.writeFileSync(path.join(tempDir, "docker-compose.yml"), "version: '3'")
    })

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true })
    })

    it("should emit runtime container status events in verbose mode", async () => {
      const adapter = new TestableDockerAdapter()
      const { events, listener } = createEventCollector()
      adapter.mockExecCommand = vi.fn(async () => ({ stdout: "", stderr: "", exitCode: 0 }))
      const mockProc = setupMockProcess(adapter)
      const runPromise = adapter.testRunContainer(
        tempDir,
        ["test"],
        {},
        5000,
        true,
        "job-1",
        "run-1",
        listener,
      )
      mockProc.stdout.emit("data", Buffer.from('{"output": "result"}\n'))
      mockProc.emit("close", 0)
      await runPromise
      expect(findContainerStatusEvent(events, "starting", "runtime")).toBeDefined()
      expect(findContainerStatusEvent(events, "running", "runtime")).toBeDefined()
      expect(findContainerStatusEvent(events, "stopped", "runtime")).toBeDefined()
    })

    it("should emit proxy status events when proxy directory exists", async () => {
      const adapter = new TestableDockerAdapter()
      const { events, listener } = createEventCollector()
      fs.mkdirSync(path.join(tempDir, "proxy"))
      adapter.mockExecCommand = vi.fn(async () => ({ stdout: "", stderr: "", exitCode: 0 }))
      const mockProcs: MockProcess[] = []
      adapter.mockCreateProcess = () => {
        const proc = createMockProcess()
        mockProcs.push(proc)
        return proc
      }
      const runPromise = adapter.testRunContainer(
        tempDir,
        ["test"],
        {},
        10000,
        true,
        "job-1",
        "run-1",
        listener,
      )
      // Proxy startup requires 2 second wait in production code
      await new Promise((r) => setTimeout(r, 2100))
      if (mockProcs[1]) {
        mockProcs[1].stdout.emit("data", Buffer.from('{"output": "result"}\n'))
        mockProcs[1].emit("close", 0)
      }
      await runPromise
      expect(findContainerStatusEvent(events, "starting", "proxy")).toBeDefined()
      expect(findContainerStatusEvent(events, "healthy", "proxy")).toBeDefined()
    }, 15000)

    it("should not emit container status events when verbose is false", async () => {
      const adapter = new TestableDockerAdapter()
      const { events, listener } = createEventCollector()
      adapter.mockExecCommand = vi.fn(async () => ({ stdout: "", stderr: "", exitCode: 0 }))
      const mockProc = setupMockProcess(adapter)
      const runPromise = adapter.testRunContainer(
        tempDir,
        ["test"],
        {},
        5000,
        false,
        "job-1",
        "run-1",
        listener,
      )
      mockProc.stdout.emit("data", Buffer.from('{"output": "result"}\n'))
      mockProc.emit("close", 0)
      await runPromise
      const containerEvents = events.filter(
        (e) => "type" in e && e.type === "dockerContainerStatus",
      )
      expect(containerEvents).toHaveLength(0)
    })

    it("should kill proxy log process in finally block", async () => {
      const adapter = new TestableDockerAdapter()
      fs.mkdirSync(path.join(tempDir, "proxy"))
      adapter.mockExecCommand = vi.fn(async () => ({ stdout: "", stderr: "", exitCode: 0 }))
      const mockProcs: MockProcess[] = []
      adapter.mockCreateProcess = () => {
        const proc = createMockProcess()
        mockProcs.push(proc)
        return proc
      }
      const runPromise = adapter.testRunContainer(
        tempDir,
        ["test"],
        {},
        5000,
        true,
        "job-1",
        "run-1",
        () => {},
      )
      // Proxy startup requires 2 second wait in production code
      await new Promise((r) => setTimeout(r, 2100))
      if (mockProcs[1]) {
        mockProcs[1].stdout.emit("data", Buffer.from('{"output": "result"}\n'))
        mockProcs[1].emit("close", 0)
      }
      await runPromise
      expect(mockProcs[0]?.kill).toHaveBeenCalledWith("SIGTERM")
    }, 10000)
  })
})
