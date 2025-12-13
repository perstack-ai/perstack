import type { ChildProcess } from "node:child_process"
import { spawn } from "node:child_process"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import type {
  AdapterRunParams,
  AdapterRunResult,
  Checkpoint,
  Expert,
  PerstackConfig,
  PrerequisiteResult,
  RunEvent,
  RuntimeAdapter,
  RuntimeEvent,
  RuntimeExpertConfig,
} from "@perstack/core"
import { BaseAdapter, checkpointSchema } from "@perstack/core"
import { generateBuildContext } from "./compose-generator.js"
import { extractRequiredEnvVars, resolveEnvValues } from "./env-resolver.js"

export class DockerAdapter extends BaseAdapter implements RuntimeAdapter {
  readonly name = "docker"
  protected version = "0.0.1"

  async checkPrerequisites(): Promise<PrerequisiteResult> {
    try {
      const result = await this.execCommand(["docker", "--version"])
      if (result.exitCode !== 0) {
        return {
          ok: false,
          error: {
            type: "cli-not-found",
            message: "Docker CLI is not installed or not in PATH.",
            helpUrl: "https://docs.docker.com/get-docker/",
          },
        }
      }
      const versionMatch = result.stdout.match(/Docker version ([\d.]+)/)
      this.version = versionMatch?.[1] ?? "unknown"
    } catch {
      return {
        ok: false,
        error: {
          type: "cli-not-found",
          message: "Docker CLI is not installed or not in PATH.",
          helpUrl: "https://docs.docker.com/get-docker/",
        },
      }
    }
    try {
      const pingResult = await this.execCommand(["docker", "info"])
      if (pingResult.exitCode !== 0) {
        return {
          ok: false,
          error: {
            type: "cli-not-found",
            message: "Docker daemon is not running.",
            helpUrl: "https://docs.docker.com/config/daemon/start/",
          },
        }
      }
    } catch {
      return {
        ok: false,
        error: {
          type: "cli-not-found",
          message: "Docker daemon is not running.",
          helpUrl: "https://docs.docker.com/config/daemon/start/",
        },
      }
    }
    return { ok: true }
  }

  convertExpert(expert: Expert): RuntimeExpertConfig {
    return { instruction: expert.instruction }
  }

  async run(params: AdapterRunParams): Promise<AdapterRunResult> {
    const { setting, config, eventListener } = params
    const events: (RunEvent | RuntimeEvent)[] = []
    if (!config) {
      throw new Error("DockerAdapter requires config in AdapterRunParams")
    }
    const expertKey = setting.expertKey
    const buildDir = await this.prepareBuildContext(config, expertKey)
    try {
      await this.buildImages(buildDir)
      const envRequirements = extractRequiredEnvVars(config, expertKey)
      const { resolved: envVars, missing } = resolveEnvValues(envRequirements, process.env)
      if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(", ")}`)
      }
      const cliArgs = this.buildCliArgs(setting)
      const maxSteps = setting.maxSteps ?? 100
      const processTimeout = (setting.timeout ?? 60000) * maxSteps
      const result = await this.runContainer(
        buildDir,
        cliArgs,
        envVars,
        processTimeout,
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
      const terminalEventTypes = [
        "completeRun",
        "stopRunByInteractiveTool",
        "stopRunByDelegate",
        "stopRunByExceededMaxSteps",
      ]
      const terminalEvent = events.find((e) => terminalEventTypes.includes(e.type)) as
        | (RunEvent & { checkpoint: Checkpoint })
        | undefined
      if (!terminalEvent?.checkpoint) {
        throw new Error("No terminal event with checkpoint received from container")
      }
      return { checkpoint: terminalEvent.checkpoint, events }
    } finally {
      await this.cleanup(buildDir)
    }
  }

  protected async prepareBuildContext(config: PerstackConfig, expertKey: string): Promise<string> {
    const buildDir = fs.mkdtempSync(path.join(os.tmpdir(), "perstack-docker-"))
    const context = generateBuildContext(config, expertKey)
    fs.writeFileSync(path.join(buildDir, "Dockerfile"), context.dockerfile)
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
    }
    const workspaceDir = path.join(buildDir, "workspace")
    fs.mkdirSync(workspaceDir)
    return buildDir
  }

  protected async buildImages(buildDir: string): Promise<void> {
    const result = await this.execCommand([
      "docker",
      "compose",
      "-f",
      path.join(buildDir, "docker-compose.yml"),
      "build",
    ])
    if (result.exitCode !== 0) {
      throw new Error(`Docker build failed: ${result.stderr}`)
    }
  }

  protected async runContainer(
    buildDir: string,
    cliArgs: string[],
    envVars: Record<string, string>,
    timeout: number,
    eventListener: (event: RunEvent | RuntimeEvent) => void,
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const composeFile = path.join(buildDir, "docker-compose.yml")
    const envArgs: string[] = []
    for (const [key, value] of Object.entries(envVars)) {
      envArgs.push("-e", `${key}=${value}`)
    }
    const args = ["compose", "-f", composeFile, "run", "--rm", ...envArgs, "runtime", ...cliArgs]
    const proc = spawn("docker", args, {
      cwd: buildDir,
      env: { ...process.env },
      stdio: ["pipe", "pipe", "pipe"],
    })
    proc.stdin.end()
    return this.executeWithStreaming(proc, timeout, eventListener)
  }

  protected buildCliArgs(setting: AdapterRunParams["setting"]): string[] {
    const args: string[] = []
    if (setting.maxSteps !== undefined) {
      args.push("--max-steps", String(setting.maxSteps))
    }
    if (setting.timeout !== undefined) {
      args.push("--timeout", String(setting.timeout))
    }
    if (setting.temperature !== undefined) {
      args.push("--temperature", String(setting.temperature))
    }
    args.push(setting.input.text ?? "")
    return args
  }

  protected executeWithStreaming(
    proc: ChildProcess,
    timeout: number,
    eventListener: (event: RunEvent | RuntimeEvent) => void,
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      let stdout = ""
      let stderr = ""
      let buffer = ""
      const timer = setTimeout(() => {
        proc.kill("SIGTERM")
        reject(new Error(`Docker container timed out after ${timeout}ms`))
      }, timeout)
      proc.stdout?.on("data", (data) => {
        const chunk = data.toString()
        stdout += chunk
        buffer += chunk
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          try {
            const parsed = JSON.parse(trimmed) as RunEvent | RuntimeEvent
            const terminalEventTypes = [
              "completeRun",
              "stopRunByInteractiveTool",
              "stopRunByDelegate",
              "stopRunByExceededMaxSteps",
            ]
            if (terminalEventTypes.includes(parsed.type) && "checkpoint" in parsed) {
              const checkpointData = parsed.checkpoint
              parsed.checkpoint = checkpointSchema.parse(checkpointData)
            }
            eventListener(parsed)
          } catch {
            // ignore non-JSON lines
          }
        }
      })
      proc.stderr?.on("data", (data) => {
        stderr += data.toString()
      })
      proc.on("close", (code) => {
        clearTimeout(timer)
        resolve({ stdout, stderr, exitCode: code ?? 127 })
      })
      proc.on("error", (err) => {
        clearTimeout(timer)
        reject(err)
      })
    })
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
