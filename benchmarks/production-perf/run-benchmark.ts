#!/usr/bin/env npx tsx
/**
 * Benchmark: Production Performance Metrics
 *
 * Measures key performance indicators for production readiness:
 * - TTFLC (Time to First LLM Call): initializeRuntime → startGeneration
 * - TTFT (Time to First Token): initializeRuntime → first streaming token
 *
 * Tests with and without lockfile to measure the impact of `perstack install`.
 *
 * Usage:
 *   npx tsx benchmarks/production-perf/run-benchmark.ts
 */

import { spawn } from "node:child_process"
import { existsSync, unlinkSync } from "node:fs"

const CONFIG_PATH = "./benchmarks/production-perf/perstack.toml"
const LOCKFILE_PATH = "./benchmarks/production-perf/perstack.lock"

interface PerformanceMetrics {
  initializeRuntimeAt: number | null
  startGenerationAt: number | null
  firstTokenAt: number | null
  completeRunAt: number | null
  skillMetrics: SkillMetrics[]
  eventSequence: { type: string; timestamp: number; relativeMs: number }[]
}

interface SkillMetrics {
  skillName: string
  spawnDurationMs: number
  totalDurationMs: number
}

interface BenchmarkResult {
  name: string
  config: string
  expert: string
  metrics: PerformanceMetrics
  ttflc: number | null
  ttft: number | null
  totalDuration: number | null
  success: boolean
  error?: string
}

async function runInstall(): Promise<boolean> {
  return new Promise((resolve) => {
    console.log("   Running perstack install...")
    const proc = spawn(
      "npx",
      ["tsx", "./apps/perstack/bin/cli.ts", "install", "--config", CONFIG_PATH],
      {
        cwd: process.cwd(),
        env: { ...process.env },
        stdio: ["pipe", "pipe", "pipe"],
      },
    )

    proc.on("close", (code) => {
      if (code === 0) {
        console.log("   Lockfile generated successfully")
        resolve(true)
      } else {
        console.error("   Failed to generate lockfile")
        resolve(false)
      }
    })

    proc.on("error", () => resolve(false))

    setTimeout(() => {
      proc.kill("SIGTERM")
      resolve(false)
    }, 60000)
  })
}

function deleteLockfile(): void {
  if (existsSync(LOCKFILE_PATH)) {
    unlinkSync(LOCKFILE_PATH)
    console.log("   Deleted existing lockfile")
  }
}

async function runBenchmark(
  name: string,
  expertName: string,
  args: string[] = [],
): Promise<BenchmarkResult> {
  const metrics: PerformanceMetrics = {
    initializeRuntimeAt: null,
    startGenerationAt: null,
    firstTokenAt: null,
    completeRunAt: null,
    skillMetrics: [],
    eventSequence: [],
  }

  return new Promise((resolve) => {
    const proc = spawn(
      "npx",
      [
        "tsx",
        "./apps/runtime/bin/cli.ts",
        "run",
        "--config",
        CONFIG_PATH,
        expertName,
        "Hello",
        ...args,
      ],
      {
        cwd: process.cwd(),
        env: { ...process.env },
        stdio: ["pipe", "pipe", "pipe"],
      },
    )

    let stdout = ""
    let success = false
    let error: string | undefined

    proc.stdout.on("data", (data) => {
      stdout += data.toString()
    })

    proc.stderr.on("data", (data) => {
      const msg = data.toString().trim()
      if (msg && !msg.includes("Running @perstack")) {
        console.error(`  [stderr] ${msg}`)
      }
    })

    proc.on("close", (code) => {
      success = code === 0

      const lines = stdout.split("\n").filter((line) => line.trim())
      for (const line of lines) {
        try {
          const event = JSON.parse(line) as Record<string, unknown>
          const timestamp = event.timestamp as number | undefined
          const eventType = event.type as string

          switch (eventType) {
            case "initializeRuntime":
              if (timestamp) metrics.initializeRuntimeAt = timestamp
              break
            case "startGeneration":
              if (timestamp && metrics.startGenerationAt === null) {
                metrics.startGenerationAt = timestamp
              }
              break
            case "streamReasoning":
            case "streamRunResult":
              if (timestamp && metrics.firstTokenAt === null) {
                metrics.firstTokenAt = timestamp
              }
              break
            case "completeRun":
              if (timestamp) metrics.completeRunAt = timestamp
              break
            case "skillConnected": {
              const skillName = event.skillName as string
              if (skillName) {
                metrics.skillMetrics.push({
                  skillName,
                  spawnDurationMs: (event.spawnDurationMs as number) ?? 0,
                  totalDurationMs: (event.totalDurationMs as number) ?? 0,
                })
              }
              break
            }
          }

          // Record event sequence for key events
          const keyEvents = [
            "initializeRuntime",
            "skillStarting",
            "skillConnected",
            "startRun",
            "startGeneration",
            "callTools",
            "streamReasoning",
            "streamRunResult",
            "completeRun",
          ]
          if (keyEvents.includes(eventType) && timestamp) {
            const relativeMs = metrics.initializeRuntimeAt
              ? timestamp - metrics.initializeRuntimeAt
              : 0
            metrics.eventSequence.push({ type: eventType, timestamp, relativeMs })
          }
        } catch {
          // Ignore non-JSON lines
        }
      }

      if (!success) {
        error = `Exit code: ${code}`
      }

      const ttflc =
        metrics.initializeRuntimeAt && metrics.startGenerationAt
          ? metrics.startGenerationAt - metrics.initializeRuntimeAt
          : null

      const ttft =
        metrics.initializeRuntimeAt && metrics.firstTokenAt
          ? metrics.firstTokenAt - metrics.initializeRuntimeAt
          : null

      const totalDuration =
        metrics.initializeRuntimeAt && metrics.completeRunAt
          ? metrics.completeRunAt - metrics.initializeRuntimeAt
          : null

      resolve({
        name,
        config: CONFIG_PATH,
        expert: expertName,
        metrics,
        ttflc,
        ttft,
        totalDuration,
        success,
        error,
      })
    })

    proc.on("error", (err) => {
      resolve({
        name,
        config: CONFIG_PATH,
        expert: expertName,
        metrics,
        ttflc: null,
        ttft: null,
        totalDuration: null,
        success: false,
        error: err.message,
      })
    })

    setTimeout(() => {
      proc.kill("SIGTERM")
      resolve({
        name,
        config: CONFIG_PATH,
        expert: expertName,
        metrics,
        ttflc: null,
        ttft: null,
        totalDuration: null,
        success: false,
        error: "Timeout after 180s",
      })
    }, 180000)
  })
}

function formatMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "-"
  return `${ms}ms`
}

function printResults(results: BenchmarkResult[]): void {
  console.log("\n" + "=".repeat(100))
  console.log("PRODUCTION PERFORMANCE BENCHMARK RESULTS")
  console.log("=".repeat(100))

  const header =
    "Test".padEnd(35) +
    "TTFLC".padStart(10) +
    "TTFT".padStart(10) +
    "Total".padStart(10) +
    "Base".padStart(10) +
    "MCP Srv".padStart(10) +
    "Status".padStart(10)
  console.log(header)
  console.log("-".repeat(95))

  for (const result of results) {
    const baseSkill = result.metrics.skillMetrics.find((s) => s.skillName === "@perstack/base")
    const mcpServerSkill = result.metrics.skillMetrics.find(
      (s) => s.skillName === "@perstack/e2e-mcp-server",
    )

    const row =
      result.name.padEnd(35) +
      formatMs(result.ttflc).padStart(10) +
      formatMs(result.ttft).padStart(10) +
      formatMs(result.totalDuration).padStart(10) +
      formatMs(baseSkill?.totalDurationMs).padStart(10) +
      formatMs(mcpServerSkill?.totalDurationMs).padStart(10) +
      (result.success ? "OK" : "FAIL").padStart(10)
    console.log(row)

    if (!result.success && result.error) {
      console.log(`  Error: ${result.error}`)
    }
  }

  console.log("-".repeat(95))

  console.log("\nLegend:")
  console.log("  TTFLC   = Time to First LLM Call (initializeRuntime → startGeneration)")
  console.log("  TTFT    = Time to First Token (initializeRuntime → first streaming token)")
  console.log("  Total   = Total run duration")
  console.log("  Base    = @perstack/base initialization time")
  console.log("  MCP Srv = @perstack/e2e-mcp-server initialization time")

  console.log("\nTarget Metrics (Epic #234):")
  console.log("  TTFLC Target: <100ms (with lockfile + bundled base)")
  console.log("  Base Init Target: <50ms for bundled base (InMemoryTransport)")

  console.log("=".repeat(100))
}

function printEventSequence(result: BenchmarkResult): void {
  console.log(`\nEvent Sequence for "${result.name}":`)
  for (const event of result.metrics.eventSequence) {
    console.log(`  +${event.relativeMs.toString().padStart(6)}ms  ${event.type}`)
  }
}

function printComparison(withoutLockfile: BenchmarkResult, withLockfile: BenchmarkResult): void {
  console.log("\n" + "=".repeat(60))
  console.log("LOCKFILE IMPACT COMPARISON")
  console.log("=".repeat(60))

  if (withoutLockfile.ttflc !== null && withLockfile.ttflc !== null) {
    const ttflcDiff = withoutLockfile.ttflc - withLockfile.ttflc
    const ttflcImprovement = ((ttflcDiff / withoutLockfile.ttflc) * 100).toFixed(1)
    console.log(`TTFLC:`)
    console.log(`  Without lockfile: ${withoutLockfile.ttflc}ms`)
    console.log(`  With lockfile:    ${withLockfile.ttflc}ms`)
    console.log(`  Improvement:      ${ttflcDiff}ms (${ttflcImprovement}% faster)`)
  }

  if (withoutLockfile.ttft !== null && withLockfile.ttft !== null) {
    const ttftDiff = withoutLockfile.ttft - withLockfile.ttft
    const ttftImprovement = ((ttftDiff / withoutLockfile.ttft) * 100).toFixed(1)
    console.log(`\nTTFT:`)
    console.log(`  Without lockfile: ${withoutLockfile.ttft}ms`)
    console.log(`  With lockfile:    ${withLockfile.ttft}ms`)
    console.log(`  Improvement:      ${ttftDiff}ms (${ttftImprovement}% faster)`)
  }

  console.log("=".repeat(60))
}

async function main() {
  console.log("Production Performance Benchmark")
  console.log("=================================")
  console.log("Measuring TTFLC and TTFT with realistic skill setup")
  console.log("Skills: @perstack/base (bundled) + @perstack/e2e-mcp-server (external)")
  console.log("")

  const results: BenchmarkResult[] = []

  // Phase 1: Without lockfile
  console.log("Phase 1: Without lockfile")
  console.log("-".repeat(40))
  deleteLockfile()

  console.log("\n1. Without lockfile (no reasoning)...")
  const withoutLockNoReasoning = await runBenchmark(
    "No lockfile (no reasoning)",
    "perf-production",
    ["--reasoning-budget", "none"],
  )
  results.push(withoutLockNoReasoning)
  console.log(
    `   TTFLC: ${formatMs(withoutLockNoReasoning.ttflc)}, TTFT: ${formatMs(withoutLockNoReasoning.ttft)}`,
  )

  console.log("\n2. Without lockfile (minimal reasoning)...")
  const withoutLockMinimal = await runBenchmark(
    "No lockfile (minimal reasoning)",
    "perf-production",
    ["--reasoning-budget", "minimal"],
  )
  results.push(withoutLockMinimal)
  console.log(
    `   TTFLC: ${formatMs(withoutLockMinimal.ttflc)}, TTFT: ${formatMs(withoutLockMinimal.ttft)}`,
  )

  // Phase 2: With lockfile
  console.log("\n\nPhase 2: With lockfile")
  console.log("-".repeat(40))

  const installSuccess = await runInstall()
  if (!installSuccess) {
    console.error("Failed to generate lockfile, skipping lockfile tests")
    printResults(results)
    return
  }

  console.log("\n3. With lockfile (no reasoning)...")
  const withLockNoReasoning = await runBenchmark(
    "With lockfile (no reasoning)",
    "perf-production",
    ["--reasoning-budget", "none"],
  )
  results.push(withLockNoReasoning)
  console.log(
    `   TTFLC: ${formatMs(withLockNoReasoning.ttflc)}, TTFT: ${formatMs(withLockNoReasoning.ttft)}`,
  )

  console.log("\n4. With lockfile (minimal reasoning)...")
  const withLockMinimal = await runBenchmark(
    "With lockfile (minimal reasoning)",
    "perf-production",
    ["--reasoning-budget", "minimal"],
  )
  results.push(withLockMinimal)
  console.log(
    `   TTFLC: ${formatMs(withLockMinimal.ttflc)}, TTFT: ${formatMs(withLockMinimal.ttft)}`,
  )

  // Clean up
  deleteLockfile()

  // Print results
  printResults(results)

  // Print event sequences to diagnose timing
  console.log("\n" + "=".repeat(60))
  console.log("EVENT SEQUENCE ANALYSIS")
  console.log("=".repeat(60))
  printEventSequence(withoutLockNoReasoning)
  printEventSequence(withLockNoReasoning)

  printComparison(withoutLockNoReasoning, withLockNoReasoning)

  // Summary
  const withLockResults = [withLockNoReasoning, withLockMinimal].filter((r) => r.ttflc !== null)
  if (withLockResults.length > 0) {
    const avgTtflc =
      withLockResults.map((r) => r.ttflc as number).reduce((a, b) => a + b, 0) /
      withLockResults.length
    console.log(`\nAverage TTFLC (with lockfile): ${avgTtflc.toFixed(1)}ms`)

    if (avgTtflc < 100) {
      console.log("✓ TTFLC target (<100ms) achieved!")
    } else {
      console.log("✗ TTFLC target (<100ms) not met")
    }
  }
}

main().catch(console.error)
