import type { ChildProcess } from "node:child_process"
import { spawn } from "node:child_process"
import type { Expert } from "@perstack/core"
import type {
  AdapterRunParams,
  AdapterRunResult,
  PrerequisiteResult,
  RuntimeAdapter,
  RuntimeExpertConfig,
} from "./types.js"

export type ExecResult = {
  stdout: string
  stderr: string
  exitCode: number
}

export abstract class BaseAdapter implements RuntimeAdapter {
  abstract readonly name: string
  abstract checkPrerequisites(): Promise<PrerequisiteResult>
  abstract run(params: AdapterRunParams): Promise<AdapterRunResult>

  convertExpert(expert: Expert): RuntimeExpertConfig {
    return { instruction: expert.instruction }
  }

  protected execCommand(args: string[]): Promise<ExecResult> {
    return new Promise((resolve) => {
      const [cmd, ...cmdArgs] = args
      const proc = spawn(cmd, cmdArgs, { cwd: process.cwd(), stdio: ["pipe", "pipe", "pipe"] })
      let stdout = ""
      let stderr = ""
      proc.stdout.on("data", (data) => {
        stdout += data.toString()
      })
      proc.stderr.on("data", (data) => {
        stderr += data.toString()
      })
      proc.on("close", (code) => {
        resolve({ stdout, stderr, exitCode: code ?? 127 })
      })
      proc.on("error", () => {
        resolve({ stdout: "", stderr: "", exitCode: 127 })
      })
    })
  }

  protected executeWithTimeout(proc: ChildProcess, timeout: number): Promise<ExecResult> {
    return new Promise((resolve, reject) => {
      let stdout = ""
      let stderr = ""
      const timer = setTimeout(() => {
        proc.kill("SIGTERM")
        reject(new Error(`${this.name} timed out after ${timeout}ms`))
      }, timeout)
      proc.stdout?.on("data", (data) => {
        stdout += data.toString()
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
