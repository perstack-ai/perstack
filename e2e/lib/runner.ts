import { spawn } from "node:child_process"
import { type ParsedEvent, parseEvents } from "./event-parser.js"
import { injectProviderArgs } from "./round-robin.js"

export type CommandResult = {
  stdout: string
  stderr: string
  exitCode: number
}

export type RunResult = CommandResult & {
  events: ParsedEvent[]
  jobId: string | null
  runId: string | null
}

export function withEventParsing(result: CommandResult): RunResult {
  const events = parseEvents(result.stdout)
  const startRunEvent = events.find((e) => e.type === "startRun")
  const jobId = startRunEvent ? ((startRunEvent as { jobId?: string }).jobId ?? null) : null
  const runId = startRunEvent ? ((startRunEvent as { runId?: string }).runId ?? null) : null
  return { ...result, events, jobId, runId }
}

export async function runCli(
  args: string[],
  options?: { timeout?: number; cwd?: string; env?: Record<string, string> },
): Promise<CommandResult> {
  const timeout = options?.timeout ?? 30000
  const cwd = options?.cwd ?? process.cwd()
  const env = options?.env ?? { ...process.env }
  const finalArgs = args[0] === "run" ? injectProviderArgs(args) : args
  return new Promise((resolve, reject) => {
    let stdout = ""
    let stderr = ""
    const proc = spawn("npx", ["tsx", "./packages/perstack/bin/cli.ts", ...finalArgs], {
      cwd,
      env,
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

export async function runRuntimeCli(
  args: string[],
  options?: { timeout?: number; cwd?: string; env?: Record<string, string> },
): Promise<CommandResult> {
  const timeout = options?.timeout ?? 30000
  const cwd = options?.cwd ?? process.cwd()
  const env = options?.env ?? { ...process.env }
  const finalArgs = args[0] === "run" ? injectProviderArgs(args) : args
  return new Promise((resolve, reject) => {
    let stdout = ""
    let stderr = ""
    const proc = spawn("npx", ["tsx", "./packages/runtime/bin/cli.ts", ...finalArgs], {
      cwd,
      env,
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
