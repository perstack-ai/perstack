import { spawn } from "node:child_process"
import { type ParsedEvent, parseEvents } from "./event-parser.js"

export type CommandResult = {
  stdout: string
  stderr: string
  exitCode: number
}

export type RunResult = CommandResult & {
  events: ParsedEvent[]
  runId: string | null
}

export async function runCli(
  args: string[],
  options?: { timeout?: number; cwd?: string },
): Promise<CommandResult> {
  const timeout = options?.timeout ?? 30000
  const cwd = options?.cwd ?? process.cwd()
  return new Promise((resolve, reject) => {
    let stdout = ""
    let stderr = ""
    const proc = spawn("npx", ["tsx", "./packages/perstack/bin/cli.ts", ...args], {
      cwd,
      env: { ...process.env },
      stdio: ["pipe", "pipe", "pipe"],
    })
    const timer = setTimeout(() => {
      proc.kill("SIGTERM")
      reject(new Error(`Timeout after ${timeout}ms`))
    }, timeout)
    proc.stdout.on("data", (data) => {
      stdout += data.toString()
    })
    proc.stderr.on("data", (data) => {
      stderr += data.toString()
    })
    proc.on("close", (code) => {
      clearTimeout(timer)
      resolve({ stdout, stderr, exitCode: code ?? 0 })
    })
    proc.on("error", (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

export async function runExpert(
  expertKey: string,
  query: string,
  options?: {
    configPath?: string
    timeout?: number
    continueRunId?: string
    isInteractiveResult?: boolean
  },
): Promise<RunResult> {
  const timeout = options?.timeout ?? 120000
  const args = ["run"]
  if (options?.configPath) {
    args.push("--config", options.configPath)
  }
  if (options?.continueRunId) {
    args.push("--continue-run", options.continueRunId)
  }
  if (options?.isInteractiveResult) {
    args.push("-i")
  }
  args.push(expertKey, query)
  return new Promise((resolve, reject) => {
    let stdout = ""
    let stderr = ""
    const proc = spawn("npx", ["tsx", "./packages/perstack/bin/cli.ts", ...args], {
      cwd: process.cwd(),
      env: { ...process.env },
      stdio: ["pipe", "pipe", "pipe"],
    })
    const timer = setTimeout(() => {
      proc.kill("SIGTERM")
      reject(new Error(`Timeout after ${timeout}ms`))
    }, timeout)
    proc.stdout.on("data", (data) => {
      stdout += data.toString()
    })
    proc.stderr.on("data", (data) => {
      stderr += data.toString()
    })
    proc.on("close", (code) => {
      clearTimeout(timer)
      const events = parseEvents(stdout)
      const startRunEvent = events.find((e) => e.type === "startRun")
      const runId = startRunEvent ? ((startRunEvent as { runId?: string }).runId ?? null) : null
      resolve({
        stdout,
        stderr,
        events,
        exitCode: code ?? 0,
        runId,
      })
    })
    proc.on("error", (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}
