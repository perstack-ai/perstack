import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DockerAdapter } from "./docker-adapter.js"
import {
  createEventCollector,
  createMockProcess,
  findContainerStatusEvent,
  type MockProcess,
  minimalExpertConfig,
  setupMockProcess,
  TestableDockerAdapter,
  wait,
} from "./lib/test-utils.js"

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
    let buildDir: string | null = null
    afterEach(() => {
      if (buildDir) {
        fs.rmSync(buildDir, { recursive: true, force: true })
        buildDir = null
      }
    })

    it("should create workspace directory when workspace is not provided", async () => {
      const adapter = new TestableDockerAdapter()
      buildDir = await adapter.testPrepareBuildContext(minimalExpertConfig, "test-expert")
      expect(fs.existsSync(path.join(buildDir, "workspace"))).toBe(true)
    })

    it("should not create workspace directory when workspace is provided", async () => {
      const adapter = new TestableDockerAdapter()
      const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "test-workspace-"))
      try {
        buildDir = await adapter.testPrepareBuildContext(
          minimalExpertConfig,
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
          minimalExpertConfig,
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

    it("should use QuietBuildStrategy without verbose flag", async () => {
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
    })

    it("should throw error when build fails", async () => {
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
  })

  describe("startProxyLogStream with mock spawn", () => {
    it.each([
      {
        name: "allowed CONNECT (stdout)",
        stream: "stdout" as const,
        data: "proxy-1  | 1734567890.123 TCP_TUNNEL/200 CONNECT api.anthropic.com:443\n",
        expected: {
          type: "proxyAccess",
          action: "allowed",
          domain: "api.anthropic.com",
          port: 443,
        },
      },
      {
        name: "blocked CONNECT (stdout)",
        stream: "stdout" as const,
        data: "proxy-1  | 1734567890.123 TCP_DENIED/403 CONNECT blocked.com:443\n",
        expected: { action: "blocked", domain: "blocked.com", reason: "Domain not in allowlist" },
      },
      {
        name: "allowed CONNECT (stderr)",
        stream: "stderr" as const,
        data: "1734567890.123 TCP_TUNNEL/200 CONNECT stderr-test.com:443\n",
        expected: { domain: "stderr-test.com" },
      },
    ])("should emit proxyAccess events for $name", async ({ stream, data, expected }) => {
      const adapter = new TestableDockerAdapter()
      const { events, listener } = createEventCollector()
      const mockProc = setupMockProcess(adapter)
      adapter.testStartProxyLogStream("/tmp/docker-compose.yml", "job-1", "run-1", listener)
      mockProc[stream].emit("data", Buffer.from(data))
      await wait(10)
      expect(events.length).toBe(1)
      expect(events[0]).toMatchObject(expected)
    })

    it("should ignore non-CONNECT log lines", async () => {
      const adapter = new TestableDockerAdapter()
      const { events, listener } = createEventCollector()
      const mockProc = setupMockProcess(adapter)
      adapter.testStartProxyLogStream("/tmp/docker-compose.yml", "job-1", "run-1", listener)
      mockProc.stdout.emit("data", Buffer.from("some random log line\n"))
      mockProc.stdout.emit("data", Buffer.from("TCP_MISS/200 GET http://example.com/\n"))
      await wait(10)
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
      // Mock execCommand to return healthy status for proxy health check
      adapter.mockExecCommand = vi.fn(async (args: string[]) => {
        if (args.includes("ps") && args.includes("--format") && args.includes("json")) {
          return { stdout: '{"Health": "healthy"}', stderr: "", exitCode: 0 }
        }
        return { stdout: "", stderr: "", exitCode: 0 }
      })
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
      // Wait for proxy health check and process setup
      await wait(100)
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
      // Mock execCommand to return healthy status for proxy health check
      adapter.mockExecCommand = vi.fn(async (args: string[]) => {
        if (args.includes("ps") && args.includes("--format") && args.includes("json")) {
          return { stdout: '{"Health": "healthy"}', stderr: "", exitCode: 0 }
        }
        return { stdout: "", stderr: "", exitCode: 0 }
      })
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
      // Wait for proxy health check and process setup
      await wait(100)
      if (mockProcs[1]) {
        mockProcs[1].stdout.emit("data", Buffer.from('{"output": "result"}\n'))
        mockProcs[1].emit("close", 0)
      }
      await runPromise
      expect(mockProcs[0]?.kill).toHaveBeenCalledWith("SIGTERM")
    }, 10000)
  })
})
