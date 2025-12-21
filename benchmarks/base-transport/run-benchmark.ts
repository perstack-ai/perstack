#!/usr/bin/env npx tsx
/**
 * Benchmark: InMemoryTransport vs StdioTransport for @perstack/base
 *
 * This script compares the initialization latency of:
 * 1. Bundled base (InMemoryTransport) - no version specified
 * 2. Versioned base (StdioTransport) - explicit version via npx
 *
 * Usage:
 *   npx tsx benchmarks/base-transport/run-benchmark.ts
 */

import { spawn } from "node:child_process"
import * as readline from "node:readline"

interface SkillTiming {
  skillName: string
  spawnDurationMs?: number
  handshakeDurationMs?: number
  toolDiscoveryDurationMs?: number
  connectDurationMs?: number
  totalDurationMs?: number
}

interface BenchmarkResult {
  name: string
  config: string
  skillTiming: SkillTiming | null
  runDurationMs: number
  success: boolean
  error?: string
}

async function runBenchmark(
  name: string,
  configPath: string,
  expertName: string,
): Promise<BenchmarkResult> {
  const startTime = Date.now()
  let skillTiming: SkillTiming | null = null
  let success = false
  let error: string | undefined

  return new Promise((resolve) => {
    const proc = spawn(
      "npx",
      ["tsx", "./apps/runtime/bin/cli.ts", "run", "--config", configPath, expertName, "Ready"],
      {
        cwd: process.cwd(),
        env: { ...process.env },
        stdio: ["pipe", "pipe", "pipe"],
      },
    )

    let stdout = ""

    proc.stdout.on("data", (data) => {
      stdout += data.toString()
    })

    proc.stderr.on("data", (data) => {
      // Log stderr for debugging
      const msg = data.toString().trim()
      if (msg && !msg.includes("Running @perstack/base")) {
        console.error(`  [stderr] ${msg}`)
      }
    })

    proc.on("close", (code) => {
      const runDurationMs = Date.now() - startTime
      success = code === 0

      // Parse events from stdout
      const lines = stdout.split("\n").filter((line) => line.trim())
      for (const line of lines) {
        try {
          const event = JSON.parse(line) as Record<string, unknown>
          if (event.type === "skillConnected" && event.skillName === "@perstack/base") {
            skillTiming = {
              skillName: event.skillName as string,
              spawnDurationMs: event.spawnDurationMs as number | undefined,
              handshakeDurationMs: event.handshakeDurationMs as number | undefined,
              toolDiscoveryDurationMs: event.toolDiscoveryDurationMs as number | undefined,
              connectDurationMs: event.connectDurationMs as number | undefined,
              totalDurationMs: event.totalDurationMs as number | undefined,
            }
          }
        } catch {
          // Ignore non-JSON lines
        }
      }

      if (!success) {
        error = `Exit code: ${code}`
      }

      resolve({
        name,
        config: configPath,
        skillTiming,
        runDurationMs,
        success,
        error,
      })
    })

    proc.on("error", (err) => {
      resolve({
        name,
        config: configPath,
        skillTiming: null,
        runDurationMs: Date.now() - startTime,
        success: false,
        error: err.message,
      })
    })

    // Timeout after 60 seconds
    setTimeout(() => {
      proc.kill("SIGTERM")
      resolve({
        name,
        config: configPath,
        skillTiming: null,
        runDurationMs: Date.now() - startTime,
        success: false,
        error: "Timeout after 60s",
      })
    }, 60000)
  })
}

function formatMs(ms: number | undefined): string {
  if (ms === undefined) return "-"
  return `${ms}ms`
}

function printResults(results: BenchmarkResult[]): void {
  console.log("\n" + "=".repeat(80))
  console.log("BENCHMARK RESULTS: InMemoryTransport vs StdioTransport")
  console.log("=".repeat(80))

  const header =
    "Transport".padEnd(20) +
    "Spawn".padStart(10) +
    "Handshake".padStart(12) +
    "ToolDisc".padStart(10) +
    "Total".padStart(10) +
    "Status".padStart(10)
  console.log(header)
  console.log("-".repeat(72))

  for (const result of results) {
    const timing = result.skillTiming
    const spawn = formatMs(timing?.spawnDurationMs)
    const handshake = formatMs(timing?.handshakeDurationMs)
    const toolDisc = formatMs(timing?.toolDiscoveryDurationMs)
    const total = formatMs(timing?.totalDurationMs)
    const status = result.success ? "OK" : "FAIL"

    const row =
      result.name.padEnd(20) +
      spawn.padStart(10) +
      handshake.padStart(12) +
      toolDisc.padStart(10) +
      total.padStart(10) +
      status.padStart(10)
    console.log(row)
  }

  console.log("-".repeat(72))

  // Calculate improvement
  const bundled = results.find((r) => r.name === "InMemory (bundled)")
  const versioned = results.find((r) => r.name === "Stdio (versioned)")

  if (bundled?.skillTiming?.totalDurationMs && versioned?.skillTiming?.totalDurationMs) {
    const improvement = versioned.skillTiming.totalDurationMs - bundled.skillTiming.totalDurationMs
    const improvementPercent =
      ((improvement / versioned.skillTiming.totalDurationMs) * 100).toFixed(1) + "%"
    console.log(`\nImprovement: ${improvement}ms faster (${improvementPercent} reduction)`)
    console.log(
      `  InMemory: ${bundled.skillTiming.totalDurationMs}ms vs Stdio: ${versioned.skillTiming.totalDurationMs}ms`,
    )
  }

  console.log("=".repeat(80))
}

async function main() {
  console.log("Base Transport Benchmark")
  console.log("========================")
  console.log("Comparing InMemoryTransport (bundled) vs StdioTransport (versioned)")
  console.log("")

  const results: BenchmarkResult[] = []

  // Run bundled (InMemoryTransport) benchmark
  console.log("1. Running bundled base benchmark (InMemoryTransport)...")
  const bundledResult = await runBenchmark(
    "InMemory (bundled)",
    "./benchmarks/base-transport/bundled.toml",
    "bundled-base-benchmark",
  )
  results.push(bundledResult)
  console.log(
    `   Done: ${bundledResult.skillTiming?.totalDurationMs ?? "N/A"}ms total, ${bundledResult.skillTiming?.spawnDurationMs ?? "N/A"}ms spawn`,
  )

  // Run versioned (StdioTransport) benchmark
  console.log("\n2. Running versioned base benchmark (StdioTransport)...")
  const versionedResult = await runBenchmark(
    "Stdio (versioned)",
    "./benchmarks/base-transport/versioned.toml",
    "versioned-base-benchmark",
  )
  results.push(versionedResult)
  console.log(
    `   Done: ${versionedResult.skillTiming?.totalDurationMs ?? "N/A"}ms total, ${versionedResult.skillTiming?.spawnDurationMs ?? "N/A"}ms spawn`,
  )

  // Print comparison results
  printResults(results)
}

main().catch(console.error)
