import type { ChildProcess, SpawnOptions } from "node:child_process"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import type {
  AdapterRunParams,
  AdapterRunResult,
  Expert,
  PerstackConfig,
  PrerequisiteResult,
  RunEvent,
  RuntimeAdapter,
  RuntimeEvent,
  RuntimeExpertConfig,
} from "@perstack/core"
import { BaseAdapter, createRuntimeEvent } from "@perstack/core"
import { generateBuildContext } from "./compose-generator.js"
import { extractRequiredEnvVars, resolveEnvValues } from "./env-resolver.js"
import { selectBuildStrategy } from "./lib/build-strategy.js"
import { buildCliArgs } from "./lib/cli-builder.js"
import { findTerminalEvent, parseContainerEvent } from "./lib/event-parser.js"
import { parseProxyLogLine } from "./lib/output-parser.js"
import { defaultProcessFactory, type ProcessFactory } from "./lib/process-factory.js"
import { StreamBuffer } from "./lib/stream-buffer.js"

export class DockerAdapter extends BaseAdapter implements RuntimeAdapter {
  readonly name = "docker"
  protected version = "0.0.1"
  protected readonly processFactory: ProcessFactory

  constructor(processFactory: ProcessFactory = defaultProcessFactory) {
    super()
    this.processFactory = processFactory
  }

  protected createProcess(command: string, args: string[], options: SpawnOptions): ChildProcess {
    return this.processFactory(command, args, options)
  }

  protected createPrerequisiteError(message: string, helpUrl: string): PrerequisiteResult {
    return { ok: false, error: { type: "cli-not-found", message, helpUrl } }
  }

  async checkPrerequisites(): Promise<PrerequisiteResult> {
    const cliNotFoundError = this.createPrerequisiteError(
      "Docker CLI is not installed or not in PATH.",
      "https://docs.docker.com/get-docker/",
    )
    const daemonNotRunningError = this.createPrerequisiteError(
      "Docker daemon is not running.",
      "https://docs.docker.com/config/daemon/start/",
    )
    try {
      const result = await this.execCommand(["docker", "--version"])
      if (result.exitCode !== 0) return cliNotFoundError
      const versionMatch = result.stdout.match(/Docker version ([\d.]+)/)
      this.version = versionMatch?.[1] ?? "unknown"
    } catch {
      return cliNotFoundError
    }
    try {
      const pingResult = await this.execCommand(["docker", "info"])
      if (pingResult.exitCode !== 0) return daemonNotRunningError
    } catch {
      return daemonNotRunningError
    }
    return { ok: true }
  }

  convertExpert(expert: Expert): RuntimeExpertConfig {
    return { instruction: expert.instruction }
  }

  async run(params: AdapterRunParams): Promise<AdapterRunResult> {
    const { setting, config, eventListener, workspace } = params
    if (!config) {
      throw new Error("DockerAdapter requires config in AdapterRunParams")
    }
    if (!setting.jobId || !setting.runId) {
      throw new Error("DockerAdapter requires jobId and runId in setting")
    }
    const events: (RunEvent | RuntimeEvent)[] = []
    const resolvedWorkspace = this.resolveWorkspacePath(workspace)
    const { expertKey, jobId, runId } = setting
    const buildDir = await this.prepareBuildContext(
      config,
      expertKey,
      resolvedWorkspace,
      setting.verbose,
    )

    // Register signal handlers for cleanup on interrupt
    let signalReceived = false
    const signalHandler = async (signal: string) => {
      if (signalReceived) return
      signalReceived = true
      await this.cleanup(buildDir)
      process.exit(signal === "SIGINT" ? 130 : 143)
    }
    process.on("SIGINT", () => signalHandler("SIGINT"))
    process.on("SIGTERM", () => signalHandler("SIGTERM"))

    try {
      // Emit build start event (always, not just in verbose mode)
      const buildStartEvent = createRuntimeEvent("dockerBuildProgress", jobId, runId, {
        stage: "building",
        service: "runtime",
        message: "Building Docker images...",
      })
      events.push(buildStartEvent)
      eventListener?.(buildStartEvent)

      await this.buildImages(
        buildDir,
        setting.verbose,
        jobId,
        runId,
        eventListener
          ? (event) => {
              events.push(event)
              eventListener(event)
            }
          : undefined,
      )

      // Emit build complete event
      const buildCompleteEvent = createRuntimeEvent("dockerBuildProgress", jobId, runId, {
        stage: "complete",
        service: "runtime",
        message: "Docker images built successfully",
      })
      events.push(buildCompleteEvent)
      eventListener?.(buildCompleteEvent)
      const envRequirements = extractRequiredEnvVars(config, expertKey)
      const envSource = { ...process.env, ...setting.env }
      const { resolved: envVars, missing } = resolveEnvValues(envRequirements, envSource)
      if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(", ")}`)
      }
      const cliArgs = buildCliArgs(setting)
      const maxSteps = setting.maxSteps ?? 100
      const processTimeout = (setting.timeout ?? 60000) * maxSteps
      const result = await this.runContainer(
        buildDir,
        cliArgs,
        envVars,
        processTimeout,
        setting.verbose,
        jobId,
        runId,
        (event) => {
          events.push(event)
          eventListener?.(event)
        },
      )
      if (result.exitCode !== 0) {
        throw new Error(
          `Docker container failed with exit code ${result.exitCode}: ${result.stderr}`,
        )
      }
      const terminalEvent = findTerminalEvent(events)
      if (!terminalEvent?.checkpoint) {
        throw new Error("No terminal event with checkpoint received from container")
      }
      return { checkpoint: terminalEvent.checkpoint, events }
    } finally {
      process.removeAllListeners("SIGINT")
      process.removeAllListeners("SIGTERM")
      await this.cleanup(buildDir)
    }
  }

  protected resolveWorkspacePath(workspace?: string): string | undefined {
    if (!workspace) return undefined
    const resolved = path.resolve(workspace)
    if (!fs.existsSync(resolved)) {
      throw new Error(`Workspace path does not exist: ${resolved}`)
    }
    const stats = fs.statSync(resolved)
    if (!stats.isDirectory()) {
      throw new Error(`Workspace path is not a directory: ${resolved}`)
    }
    return resolved
  }

  protected async prepareBuildContext(
    config: PerstackConfig,
    expertKey: string,
    workspace?: string,
    verbose?: boolean,
  ): Promise<string> {
    const buildDir = fs.mkdtempSync(path.join(os.tmpdir(), "perstack-docker-"))
    const context = generateBuildContext(config, expertKey, { workspacePath: workspace, verbose })
    fs.writeFileSync(path.join(buildDir, "Dockerfile"), context.dockerfile)
    fs.writeFileSync(path.join(buildDir, "perstack.toml"), context.configToml)
    fs.writeFileSync(path.join(buildDir, "docker-compose.yml"), context.composeFile)
    if (context.proxyDockerfile) {
      const proxyDir = path.join(buildDir, "proxy")
      fs.mkdirSync(proxyDir)
      fs.writeFileSync(path.join(proxyDir, "Dockerfile"), context.proxyDockerfile)
      if (context.proxySquidConf) {
        fs.writeFileSync(path.join(proxyDir, "squid.conf"), context.proxySquidConf)
      }
      if (context.proxyAllowlist) {
        fs.writeFileSync(path.join(proxyDir, "allowed_domains.txt"), context.proxyAllowlist)
      }
      if (context.proxyStartScript) {
        fs.writeFileSync(path.join(proxyDir, "start.sh"), context.proxyStartScript)
      }
    }
    if (!workspace) {
      const workspaceDir = path.join(buildDir, "workspace")
      fs.mkdirSync(workspaceDir)
    }
    return buildDir
  }

  protected async buildImages(
    buildDir: string,
    verbose?: boolean,
    jobId?: string,
    runId?: string,
    eventListener?: (event: RunEvent | RuntimeEvent) => void,
  ): Promise<void> {
    const strategy = selectBuildStrategy(verbose, !!eventListener, !!(jobId && runId))
    await strategy.build(
      { buildDir, jobId, runId, eventListener },
      (args) => this.execCommand(args),
      this.processFactory,
    )
  }

  protected emitContainerStatus(
    eventListener: (event: RunEvent | RuntimeEvent) => void,
    jobId: string,
    runId: string,
    status: "starting" | "running" | "healthy" | "unhealthy" | "stopped" | "error",
    service: string,
    message: string,
  ): void {
    eventListener(
      createRuntimeEvent("dockerContainerStatus", jobId, runId, { status, service, message }),
    )
  }

  protected async runContainer(
    buildDir: string,
    cliArgs: string[],
    envVars: Record<string, string>,
    timeout: number,
    verbose: boolean | undefined,
    jobId: string,
    runId: string,
    eventListener: (event: RunEvent | RuntimeEvent) => void,
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const composeFile = path.join(buildDir, "docker-compose.yml")
    const hasProxy = fs.existsSync(path.join(buildDir, "proxy"))
    let proxyLogProcess: ChildProcess | undefined
    if (hasProxy) {
      if (verbose) {
        this.emitContainerStatus(
          eventListener,
          jobId,
          runId,
          "starting",
          "proxy",
          "Starting proxy container...",
        )
      }
      await this.execCommand(["docker", "compose", "-f", composeFile, "up", "-d", "proxy"])

      // Wait for proxy to become healthy (healthcheck has start_period: 5s, interval: 2s)
      await this.waitForProxyHealthy(composeFile, eventListener, jobId, runId, verbose)

      if (verbose) {
        this.emitContainerStatus(
          eventListener,
          jobId,
          runId,
          "healthy",
          "proxy",
          "Proxy container ready",
        )
        proxyLogProcess = this.startProxyLogStream(composeFile, jobId, runId, eventListener)
      }
    }
    if (verbose) {
      this.emitContainerStatus(
        eventListener,
        jobId,
        runId,
        "starting",
        "runtime",
        "Starting runtime container...",
      )
    }
    const envArgs: string[] = []
    for (const [key, value] of Object.entries(envVars)) {
      envArgs.push("-e", `${key}=${value}`)
    }
    const args = ["compose", "-f", composeFile, "run", "--rm", ...envArgs, "runtime", ...cliArgs]
    const proc = this.createProcess("docker", args, {
      cwd: buildDir,
      env: { ...process.env },
      stdio: ["pipe", "pipe", "pipe"],
    })
    proc.stdin?.end()
    if (verbose) {
      this.emitContainerStatus(
        eventListener,
        jobId,
        runId,
        "running",
        "runtime",
        "Runtime container started",
      )
    }
    try {
      const result = await this.executeWithStreaming(proc, timeout, eventListener)
      if (verbose) {
        this.emitContainerStatus(
          eventListener,
          jobId,
          runId,
          "stopped",
          "runtime",
          `Runtime container exited with code ${result.exitCode}`,
        )
      }
      return result
    } finally {
      if (proxyLogProcess) {
        proxyLogProcess.kill("SIGTERM")
      }
    }
  }

  protected startProxyLogStream(
    composeFile: string,
    jobId: string,
    runId: string,
    eventListener: (event: RunEvent | RuntimeEvent) => void,
  ): ChildProcess {
    const proc = this.createProcess(
      "docker",
      ["compose", "-f", composeFile, "logs", "-f", "proxy"],
      { stdio: ["pipe", "pipe", "pipe"] },
    )
    const buffer = new StreamBuffer()
    const processLine = (line: string) => {
      const trimmed = line.trim()
      if (!trimmed) return
      const proxyEvent = parseProxyLogLine(trimmed)
      if (proxyEvent) {
        eventListener(createRuntimeEvent("proxyAccess", jobId, runId, proxyEvent))
      }
    }
    proc.stdout?.on("data", (data) => buffer.processChunk(data.toString(), processLine))
    proc.stderr?.on("data", (data) => buffer.processChunk(data.toString(), processLine))
    return proc
  }

  protected executeWithStreaming(
    proc: ChildProcess,
    timeout: number,
    eventListener: (event: RunEvent | RuntimeEvent) => void,
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      let stdout = ""
      let stderr = ""
      const buffer = new StreamBuffer()
      const timer = setTimeout(() => {
        proc.kill("SIGTERM")
        reject(new Error(`Docker container timed out after ${timeout}ms`))
      }, timeout)
      const processLine = (line: string) => {
        const parsed = parseContainerEvent(line)
        if (parsed) eventListener(parsed)
      }
      proc.stdout?.on("data", (data) => {
        const chunk = data.toString()
        stdout += chunk
        buffer.processChunk(chunk, processLine)
      })
      proc.stderr?.on("data", (data) => {
        stderr += data.toString()
      })
      proc.on("close", (code) => {
        clearTimeout(timer)
        buffer.flush(processLine)
        resolve({ stdout, stderr, exitCode: code ?? 127 })
      })
      proc.on("error", (err) => {
        clearTimeout(timer)
        reject(err)
      })
    })
  }

  protected async waitForProxyHealthy(
    composeFile: string,
    eventListener: (event: RunEvent | RuntimeEvent) => void,
    jobId: string,
    runId: string,
    verbose: boolean | undefined,
    maxAttempts = 30,
    intervalMs = 1000,
  ): Promise<void> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const result = await this.execCommand([
        "docker",
        "compose",
        "-f",
        composeFile,
        "ps",
        "--format",
        "json",
        "proxy",
      ])
      if (result.exitCode === 0 && result.stdout) {
        try {
          const status = JSON.parse(result.stdout)
          if (status.Health === "healthy") {
            return
          }
          if (verbose && attempt > 0 && attempt % 5 === 0) {
            this.emitContainerStatus(
              eventListener,
              jobId,
              runId,
              "starting",
              "proxy",
              `Waiting for proxy health check... (${attempt}/${maxAttempts})`,
            )
          }
        } catch {
          // JSON parse error, continue waiting
        }
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }
    throw new Error("Proxy container failed to become healthy within timeout")
  }

  protected async cleanup(buildDir: string): Promise<void> {
    try {
      await this.execCommand([
        "docker",
        "compose",
        "-f",
        path.join(buildDir, "docker-compose.yml"),
        "down",
        "--volumes",
        "--remove-orphans",
      ])
    } catch {
      // ignore cleanup errors
    }
    try {
      fs.rmSync(buildDir, { recursive: true, force: true })
    } catch {
      // ignore cleanup errors
    }
  }
}
