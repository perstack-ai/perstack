#!/usr/bin/env npx tsx
import * as readline from "node:readline"

interface SkillTiming {
  skillName: string
  command?: string
  args?: string[]
  startedAt?: number
  connectedAt?: number
  spawnDurationMs?: number
  handshakeDurationMs?: number
  toolDiscoveryDurationMs?: number
  connectDurationMs?: number
  totalDurationMs?: number
}

const skillTimings = new Map<string, SkillTiming>()

function formatEvent(event: Record<string, unknown>): string | null {
  const type = event.type as string

  switch (type) {
    case "skillStarting": {
      const skillName = event.skillName as string
      const command = event.command as string
      const args = event.args as string[]
      skillTimings.set(skillName, {
        skillName,
        command,
        args,
        startedAt: Date.now(),
      })
      return `[skillStarting] ${skillName}: ${command} ${args?.join(" ") ?? ""}`
    }
    case "skillConnected": {
      const skillName = event.skillName as string
      const timing = skillTimings.get(skillName) ?? { skillName }
      timing.connectedAt = Date.now()
      timing.spawnDurationMs = event.spawnDurationMs as number | undefined
      timing.handshakeDurationMs = event.handshakeDurationMs as number | undefined
      timing.toolDiscoveryDurationMs = event.toolDiscoveryDurationMs as number | undefined
      timing.connectDurationMs = event.connectDurationMs as number | undefined
      timing.totalDurationMs = event.totalDurationMs as number | undefined
      skillTimings.set(skillName, timing)
      const lines = [`[skillConnected] ${skillName}`]
      if (timing.spawnDurationMs !== undefined) {
        lines.push(`  spawn:          ${timing.spawnDurationMs}ms`)
      }
      if (timing.handshakeDurationMs !== undefined) {
        lines.push(`  handshake:      ${timing.handshakeDurationMs}ms`)
      }
      if (timing.toolDiscoveryDurationMs !== undefined) {
        lines.push(`  toolDiscovery:  ${timing.toolDiscoveryDurationMs}ms`)
      }
      if (timing.connectDurationMs !== undefined) {
        lines.push(`  connect:        ${timing.connectDurationMs}ms`)
      }
      if (timing.totalDurationMs !== undefined) {
        lines.push(`  total:          ${timing.totalDurationMs}ms`)
      }
      return lines.join("\n")
    }
    case "completeRun": {
      printSummary()
      return "[completeRun] Done"
    }
    case "startRun": {
      return "[startRun] Starting..."
    }
    default:
      return null
  }
}

function printSummary(): void {
  console.log(`\n${"=".repeat(60)}`)
  console.log("TIMING SUMMARY")
  console.log("=".repeat(60))
  const header =
    "Skill".padEnd(25) +
    "Spawn".padStart(10) +
    "Handshake".padStart(12) +
    "ToolDisc".padStart(10) +
    "Total".padStart(10)
  console.log(header)
  console.log("-".repeat(67))
  for (const timing of skillTimings.values()) {
    const spawn = timing.spawnDurationMs !== undefined ? `${timing.spawnDurationMs}ms` : "-"
    const handshake =
      timing.handshakeDurationMs !== undefined ? `${timing.handshakeDurationMs}ms` : "-"
    const toolDisc =
      timing.toolDiscoveryDurationMs !== undefined ? `${timing.toolDiscoveryDurationMs}ms` : "-"
    const total = timing.totalDurationMs !== undefined ? `${timing.totalDurationMs}ms` : "-"
    const row =
      timing.skillName.padEnd(25) +
      spawn.padStart(10) +
      handshake.padStart(12) +
      toolDisc.padStart(10) +
      total.padStart(10)
    console.log(row)
  }
  console.log("=".repeat(60))
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
})

rl.on("line", (line) => {
  try {
    const event = JSON.parse(line) as Record<string, unknown>
    const formatted = formatEvent(event)
    if (formatted) {
      console.log(formatted)
    }
  } catch {
    if (line.startsWith("[MCP]") || line.startsWith("[DEBUG]")) {
      console.log(line)
    }
  }
})

rl.on("close", () => {
  if (skillTimings.size > 0) {
    printSummary()
  }
})
