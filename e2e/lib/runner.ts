import { spawn } from "node:child_process"
import { parseEvents, type ParsedEvent } from "./event-parser.js"

export type RunResult = {
  events: ParsedEvent[]
  exitCode: number
  output: string
  runId: string | null
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
  const args = ["tsx", "./packages/perstack/bin/cli.ts", "run"]
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
    let output = ""
    const proc = spawn("npx", args, {
      cwd: process.cwd(),
      env: { ...process.env },
      stdio: ["pipe", "pipe", "pipe"],
    })
    const timer = setTimeout(() => {
      proc.kill("SIGTERM")
      reject(new Error(`Timeout after ${timeout}ms`))
    }, timeout)
    proc.stdout.on("data", (data) => {
      output += data.toString()
    })
    proc.stderr.on("data", (data) => {
      output += data.toString()
    })
    proc.on("close", (code) => {
      clearTimeout(timer)
      const events = parseEvents(output)
      const startRunEvent = events.find((e) => e.type === "startRun")
      const runId = startRunEvent ? (startRunEvent as { runId?: string }).runId ?? null : null
      resolve({
        events,
        exitCode: code ?? 0,
        output,
        runId,
      })
    })
    proc.on("error", (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}
