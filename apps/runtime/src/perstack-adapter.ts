import type { ChildProcess } from "node:child_process"
import { spawn } from "node:child_process"
import type {
  AdapterRunParams,
  AdapterRunResult,
  Checkpoint,
  Expert,
  PrerequisiteResult,
  RunEvent,
  RuntimeAdapter,
  RuntimeEvent,
  RuntimeExpertConfig,
} from "@perstack/core"
import { BaseAdapter, checkpointSchema, getFilteredEnv } from "@perstack/core"
import { run as perstackRun } from "./run.js"

export type PerstackAdapterOptions = {
  useDirectExecution?: boolean
}

export class PerstackAdapter extends BaseAdapter implements RuntimeAdapter {
  readonly name = "local"
  protected version = "unknown"
  private useDirectExecution: boolean

  constructor(options?: PerstackAdapterOptions) {
    super()
    this.useDirectExecution = options?.useDirectExecution ?? true
  }

  async checkPrerequisites(): Promise<PrerequisiteResult> {
    if (this.useDirectExecution) {
      return { ok: true }
    }
    try {
      const result = await this.execCommand(["perstack-runtime", "--version"])
      if (result.exitCode !== 0) {
        return {
          ok: false,
          error: {
            type: "cli-not-found",
            message: "perstack-runtime CLI is not available.",
          },
        }
      }
      this.version = result.stdout.trim() || "unknown"
    } catch {
      return {
        ok: false,
        error: {
          type: "cli-not-found",
          message: "perstack-runtime CLI is not available.",
        },
      }
    }
    return { ok: true }
  }

  convertExpert(expert: Expert): RuntimeExpertConfig {
    return { instruction: expert.instruction }
  }

  async run(params: AdapterRunParams): Promise<AdapterRunResult> {
    if (this.useDirectExecution) {
      return this.runDirect(params)
    }
    return this.runViaCli(params)
  }

  private async runDirect(params: AdapterRunParams): Promise<AdapterRunResult> {
    const events: (RunEvent | RuntimeEvent)[] = []
    const eventListener = (event: RunEvent | RuntimeEvent) => {
      events.push(event)
      params.eventListener?.(event)
    }
    const checkpoint = await perstackRun(
      { setting: params.setting, checkpoint: params.checkpoint },
      {
        eventListener,
        storeCheckpoint: params.storeCheckpoint,
        retrieveCheckpoint: params.retrieveCheckpoint,
      },
    )
    return { checkpoint, events }
  }

  private async runViaCli(params: AdapterRunParams): Promise<AdapterRunResult> {
    const { setting, eventListener } = params
    const events: (RunEvent | RuntimeEvent)[] = []
    const args = this.buildCliArgs(setting)
    const maxSteps = setting.maxSteps ?? 100
    const processTimeout = (setting.timeout ?? 60000) * maxSteps
    const result = await this.executeRuntimeCli(args, processTimeout, (event) => {
      events.push(event)
      eventListener?.(event)
    })
    if (result.exitCode !== 0) {
      throw new Error(`perstack-runtime CLI failed with exit code ${result.exitCode}`)
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
      throw new Error("No terminal event with checkpoint received from CLI")
    }
    return { checkpoint: terminalEvent.checkpoint, events }
  }

  private buildCliArgs(setting: AdapterRunParams["setting"]): string[] {
    const args = ["run"]
    if (setting.jobId) {
      args.push("--job-id", setting.jobId)
    }
    if (setting.runId) {
      args.push("--run-id", setting.runId)
    }
    if (setting.maxSteps !== undefined) {
      args.push("--max-steps", String(setting.maxSteps))
    }
    if (setting.maxRetries !== undefined) {
      args.push("--max-retries", String(setting.maxRetries))
    }
    if (setting.timeout !== undefined) {
      args.push("--timeout", String(setting.timeout))
    }
    if (setting.temperature !== undefined) {
      args.push("--temperature", String(setting.temperature))
    }
    if (setting.model) {
      args.push("--model", setting.model)
    }
    if (setting.providerConfig?.providerName) {
      args.push("--provider", setting.providerConfig.providerName)
    }
    args.push(setting.expertKey, setting.input.text ?? "")
    return args
  }

  private executeRuntimeCli(
    args: string[],
    timeout: number,
    eventListener: (event: RunEvent | RuntimeEvent) => void,
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const proc = spawn("perstack-runtime", args, {
      cwd: process.cwd(),
      env: getFilteredEnv(),
      stdio: ["pipe", "pipe", "pipe"],
    })
    proc.stdin.end()
    return this.executeWithStreaming(proc, timeout, eventListener)
  }

  private executeWithStreaming(
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
        reject(new Error(`perstack-runtime timed out after ${timeout}ms`))
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
}
