import type { ChildProcess } from "node:child_process"
import { spawn } from "node:child_process"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { createId } from "@paralleldrive/cuid2"
import type {
  AdapterRunParams,
  AdapterRunResult,
  Checkpoint,
  DelegationTarget,
  Expert,
  PerstackConfig,
  PrerequisiteResult,
  RunEvent,
  RuntimeAdapter,
  RuntimeEvent,
  RuntimeExpertConfig,
  ToolResult,
  Usage,
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
    let allEvents: (RunEvent | RuntimeEvent)[] = []
    if (!config) {
      throw new Error("DockerAdapter requires config in AdapterRunParams")
    }
    let currentSetting = { ...setting }
    let currentCheckpoint: Checkpoint | undefined = params.checkpoint
    while (true) {
      const { checkpoint, events } = await this.runSingleExpert(
        currentSetting,
        currentCheckpoint,
        config,
        eventListener,
      )
      allEvents = [...allEvents, ...events]
      if (checkpoint.status === "stoppedByDelegate") {
        const delegateTo = checkpoint.delegateTo
        if (!delegateTo || delegateTo.length === 0) {
          throw new Error("No delegations found in checkpoint")
        }
        const delegationResults = await Promise.all(
          delegateTo.map((delegation) =>
            this.runDelegation(delegation, currentSetting, checkpoint, config, eventListener),
          ),
        )
        for (const result of delegationResults) {
          allEvents = [...allEvents, ...result.events]
        }
        const aggregatedUsage = delegationResults.reduce(
          (acc, result) => this.sumUsage(acc, result.deltaUsage),
          checkpoint.usage,
        )
        const maxStepNumber = Math.max(...delegationResults.map((r) => r.stepNumber))
        const firstResult = delegationResults[0]
        const restResults = delegationResults.slice(1)
        const restToolResults: ToolResult[] = restResults.map((result) => ({
          id: result.toolCallId,
          skillName: `delegate/${result.expertKey}`,
          toolName: result.toolName,
          result: [{ type: "textPart" as const, id: createId(), text: result.text }],
        }))
        const processedToolCallIds = new Set(delegateTo.slice(1).map((d) => d.toolCallId))
        const remainingToolCalls = checkpoint.pendingToolCalls?.filter(
          (tc) => !processedToolCallIds.has(tc.id) && tc.id !== delegateTo[0].toolCallId,
        )
        currentSetting = {
          ...currentSetting,
          expertKey: checkpoint.expert.key,
          input: {
            interactiveToolCallResult: {
              toolCallId: firstResult.toolCallId,
              toolName: firstResult.toolName,
              skillName: `delegate/${firstResult.expertKey}`,
              text: firstResult.text,
            },
          },
        }
        currentCheckpoint = {
          ...checkpoint,
          status: "stoppedByDelegate",
          delegateTo: undefined,
          stepNumber: maxStepNumber,
          usage: aggregatedUsage,
          pendingToolCalls: remainingToolCalls?.length ? remainingToolCalls : undefined,
          partialToolResults: [...(checkpoint.partialToolResults ?? []), ...restToolResults],
        }
        continue
      }
      return { checkpoint, events: allEvents }
    }
  }
  protected async runSingleExpert(
    setting: AdapterRunParams["setting"],
    _checkpoint: Checkpoint | undefined,
    config: PerstackConfig,
    eventListener?: (event: RunEvent | RuntimeEvent) => void,
  ): Promise<{ checkpoint: Checkpoint; events: (RunEvent | RuntimeEvent)[] }> {
    const events: (RunEvent | RuntimeEvent)[] = []
    const expertKey = setting.expertKey
    const buildDir = await this.prepareBuildContext(config, expertKey)
    try {
      await this.buildImages(buildDir)
      const envRequirements = extractRequiredEnvVars(config, expertKey)
      const envSource = { ...process.env, ...setting.env }
      const { resolved: envVars, missing } = resolveEnvValues(envRequirements, envSource)
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
  protected async runDelegation(
    delegation: DelegationTarget,
    parentSetting: AdapterRunParams["setting"],
    parentCheckpoint: Checkpoint,
    config: PerstackConfig,
    eventListener?: (event: RunEvent | RuntimeEvent) => void,
  ): Promise<{
    toolCallId: string
    toolName: string
    expertKey: string
    text: string
    stepNumber: number
    deltaUsage: Usage
    events: (RunEvent | RuntimeEvent)[]
  }> {
    const { expert, toolCallId, toolName, query } = delegation
    const delegateRunId = createId()
    const delegateSetting = {
      ...parentSetting,
      runId: delegateRunId,
      expertKey: expert.key,
      input: { text: query },
    }
    const jobId = parentSetting.jobId ?? createId()
    const delegateCheckpoint: Checkpoint = {
      id: createId(),
      jobId,
      runId: delegateRunId,
      status: "init",
      stepNumber: parentCheckpoint.stepNumber,
      messages: [],
      expert: {
        key: expert.key,
        name: expert.name,
        version: expert.version,
      },
      delegatedBy: {
        expert: {
          key: parentCheckpoint.expert.key,
          name: parentCheckpoint.expert.name,
          version: parentCheckpoint.expert.version,
        },
        toolCallId,
        toolName,
        checkpointId: parentCheckpoint.id,
      },
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        reasoningTokens: 0,
        totalTokens: 0,
        cachedInputTokens: 0,
      },
      contextWindow: parentCheckpoint.contextWindow,
    }
    const result = await this.runSingleExpert(
      delegateSetting,
      delegateCheckpoint,
      config,
      eventListener,
    )
    const resultCheckpoint = result.checkpoint
    const lastMessage = resultCheckpoint.messages[resultCheckpoint.messages.length - 1]
    if (!lastMessage || lastMessage.type !== "expertMessage") {
      throw new Error("Delegation error: delegation result message is incorrect")
    }
    const textPart = lastMessage.contents.find((c) => c.type === "textPart")
    if (!textPart || textPart.type !== "textPart") {
      throw new Error("Delegation error: delegation result message does not contain text")
    }
    return {
      toolCallId,
      toolName,
      expertKey: expert.key,
      text: textPart.text,
      stepNumber: resultCheckpoint.stepNumber,
      deltaUsage: resultCheckpoint.usage,
      events: result.events,
    }
  }
  protected sumUsage(a: Usage, b: Usage): Usage {
    return {
      inputTokens: a.inputTokens + b.inputTokens,
      outputTokens: a.outputTokens + b.outputTokens,
      reasoningTokens: a.reasoningTokens + b.reasoningTokens,
      totalTokens: a.totalTokens + b.totalTokens,
      cachedInputTokens: a.cachedInputTokens + b.cachedInputTokens,
    }
  }

  protected async prepareBuildContext(config: PerstackConfig, expertKey: string): Promise<string> {
    const buildDir = fs.mkdtempSync(path.join(os.tmpdir(), "perstack-docker-"))
    const context = generateBuildContext(config, expertKey)
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
    const hasProxy = fs.existsSync(path.join(buildDir, "proxy"))
    if (hasProxy) {
      await this.execCommand(["docker", "compose", "-f", composeFile, "up", "-d", "proxy"])
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
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
    if (setting.jobId !== undefined) {
      args.push("--job-id", setting.jobId)
    }
    if (setting.runId !== undefined) {
      args.push("--run-id", setting.runId)
    }
    if (setting.model !== undefined) {
      args.push("--model", setting.model)
    }
    const maxSteps = setting.maxSteps ?? 100
    args.push("--max-steps", String(maxSteps))
    if (setting.maxRetries !== undefined) {
      args.push("--max-retries", String(setting.maxRetries))
    }
    if (setting.timeout !== undefined) {
      args.push("--timeout", String(setting.timeout))
    }
    if (setting.temperature !== undefined) {
      args.push("--temperature", String(setting.temperature))
    }
    if (setting.input.interactiveToolCallResult) {
      args.push("-i")
      args.push(JSON.stringify(setting.input.interactiveToolCallResult))
    } else {
      args.push(setting.input.text ?? "")
    }
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
          let parsed: RunEvent | RuntimeEvent
          try {
            parsed = JSON.parse(trimmed) as RunEvent | RuntimeEvent
          } catch {
            continue
          }
          const terminalEventTypes = [
            "completeRun",
            "stopRunByInteractiveTool",
            "stopRunByDelegate",
            "stopRunByExceededMaxSteps",
          ]
          if (terminalEventTypes.includes(parsed.type) && "checkpoint" in parsed) {
            try {
              const checkpointData = parsed.checkpoint
              parsed.checkpoint = checkpointSchema.parse(checkpointData)
            } catch {
              // Skip invalid checkpoint data
              continue
            }
          }
          eventListener(parsed)
        }
      })
      proc.stderr?.on("data", (data) => {
        stderr += data.toString()
      })
      proc.on("close", (code) => {
        clearTimeout(timer)
        if (buffer.trim()) {
          let parsed: RunEvent | RuntimeEvent | null = null
          try {
            parsed = JSON.parse(buffer.trim()) as RunEvent | RuntimeEvent
          } catch {
            // ignore non-JSON content
          }
          if (parsed) {
            const terminalEventTypes = [
              "completeRun",
              "stopRunByInteractiveTool",
              "stopRunByDelegate",
              "stopRunByExceededMaxSteps",
            ]
            if (terminalEventTypes.includes(parsed.type) && "checkpoint" in parsed) {
              try {
                const checkpointData = parsed.checkpoint
                parsed.checkpoint = checkpointSchema.parse(checkpointData)
              } catch {
                parsed = null
              }
            }
            if (parsed) {
              eventListener(parsed)
            }
          }
        }
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
