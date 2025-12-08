import { spawn } from "node:child_process"
import { parseEvents, type ParsedEvent } from "./event-parser.js"
import type { AssertionResult } from "./assertions.js"

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

export type TestCase = {
  name: string
  run: () => Promise<AssertionResult[]>
}

export type TestSuite = {
  name: string
  tests: TestCase[]
}

export async function runTestSuite(suite: TestSuite): Promise<{
  passed: number
  failed: number
  results: { name: string; passed: boolean; results: AssertionResult[] }[]
}> {
  console.log(`\n${"=".repeat(60)}`)
  console.log(`Running: ${suite.name}`)
  console.log(`${"=".repeat(60)}\n`)
  const results: { name: string; passed: boolean; results: AssertionResult[] }[] = []
  let passed = 0
  let failed = 0
  for (const test of suite.tests) {
    console.log(`  📋 ${test.name}`)
    try {
      const assertions = await test.run()
      const allPassed = assertions.every((a) => a.passed)
      if (allPassed) {
        passed++
        console.log(`     ✅ PASSED`)
        for (const assertion of assertions) {
          console.log(`        ${assertion.message}`)
        }
      } else {
        failed++
        console.log(`     ❌ FAILED`)
        for (const assertion of assertions) {
          const icon = assertion.passed ? "✓" : "✗"
          console.log(`        ${icon} ${assertion.message}`)
          if (assertion.details) {
            console.log(`          ${JSON.stringify(assertion.details, null, 2).split("\n").join("\n          ")}`)
          }
        }
      }
      results.push({ name: test.name, passed: allPassed, results: assertions })
    } catch (err) {
      failed++
      console.log(`     ❌ ERROR: ${err}`)
      results.push({
        name: test.name,
        passed: false,
        results: [{ passed: false, message: `Error: ${err}` }],
      })
    }
    console.log()
  }
  console.log(`${"─".repeat(60)}`)
  console.log(`Results: ${passed} passed, ${failed} failed`)
  console.log(`${"=".repeat(60)}\n`)
  return { passed, failed, results }
}

