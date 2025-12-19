#!/usr/bin/env npx tsx
/**
 * Analyze E2E test events for debugging flaky tests.
 * 
 * Usage:
 *   npx tsx scripts/analyze-e2e-events.ts /tmp/e2e-run1.log attack-symlink
 *   npx tsx scripts/analyze-e2e-events.ts /tmp/e2e-run1.log "symlink to container"
 */

import * as fs from "node:fs"
import * as readline from "node:readline"

interface SkillConnectedEvent {
  type: "skillConnected"
  skillName: string
  spawnDurationMs: number
  handshakeDurationMs: number
  connectDurationMs: number
  toolDiscoveryDurationMs: number
  totalDurationMs: number
  serverInfo?: { name: string; version: string }
}

interface SkillStderrEvent {
  type: "skillStderr"
  skillName: string
  message: string
  timestamp: number
}

interface SkillStartingEvent {
  type: "skillStarting"
  skillName: string
  command: string
  args: string[]
  timestamp: number
}

interface InitializeRuntimeEvent {
  type: "initializeRuntime"
  expertName: string
  model: string
  timestamp: number
}

interface CallToolsEvent {
  type: "callTools"
  expertKey: string
  stepNumber: number
  toolCalls: Array<{ toolName: string; skillName: string }>
}

interface CompleteRunEvent {
  type: "completeRun"
  expertKey: string
  text?: string
}

type Event = SkillConnectedEvent | SkillStderrEvent | SkillStartingEvent | 
             InitializeRuntimeEvent | CallToolsEvent | CompleteRunEvent | Record<string, unknown>

async function main() {
  const args = process.argv.slice(2)
  if (args.length < 2) {
    console.error("Usage: npx tsx scripts/analyze-e2e-events.ts <log-file> <test-filter>")
    console.error("Example: npx tsx scripts/analyze-e2e-events.ts /tmp/e2e-run1.log attack-symlink")
    process.exit(1)
  }

  const logFile = args[0]
  const testFilter = args[1]

  if (!fs.existsSync(logFile)) {
    console.error(`Log file not found: ${logFile}`)
    process.exit(1)
  }

  const content = fs.readFileSync(logFile, "utf-8")
  const lines = content.split("\n")

  // Find test sections
  let inTargetTest = false
  let testOutput: string[] = []
  let foundTest = false

  for (const line of lines) {
    // Detect test start
    if (line.includes(testFilter)) {
      inTargetTest = true
      foundTest = true
      testOutput = []
    }

    if (inTargetTest) {
      testOutput.push(line)
      
      // Detect test end (next test or end of file)
      if (testOutput.length > 1 && (line.match(/^\s+[✓×]/) || line.includes("FAIL") || line.includes("PASS"))) {
        if (!line.includes(testFilter)) {
          break
        }
      }
    }
  }

  if (!foundTest) {
    console.error(`Test not found: ${testFilter}`)
    process.exit(1)
  }

  // Parse events from output
  const events: Event[] = []
  const eventStrings: string[] = []

  for (const line of testOutput) {
    // Try to parse JSON events
    const jsonMatches = line.matchAll(/\{[^{}]*"type"[^{}]*\}/g)
    for (const match of jsonMatches) {
      try {
        const event = JSON.parse(match[0])
        if (event.type) {
          events.push(event)
          eventStrings.push(match[0])
        }
      } catch {
        // Try to find nested JSON
        const nestedMatch = line.match(/\{"type":"[^"]+"/g)
        if (nestedMatch) {
          // This line contains events, try to extract them
        }
      }
    }
  }

  // Also try to find full event lines
  for (const line of testOutput) {
    if (line.startsWith('{"type":')) {
      try {
        const event = JSON.parse(line)
        if (event.type && !events.some(e => JSON.stringify(e) === JSON.stringify(event))) {
          events.push(event)
        }
      } catch {
        // Ignore parse errors
      }
    }
  }

  console.log("=" .repeat(80))
  console.log(`Analysis for test: ${testFilter}`)
  console.log("=" .repeat(80))
  console.log()

  // Analyze skill initialization
  console.log("=== SKILL INITIALIZATION ===")
  const skillStarting = events.filter(e => e.type === "skillStarting") as SkillStartingEvent[]
  const skillConnected = events.filter(e => e.type === "skillConnected") as SkillConnectedEvent[]
  const skillStderr = events.filter(e => e.type === "skillStderr") as SkillStderrEvent[]

  for (const starting of skillStarting) {
    console.log(`\n[skillStarting] ${starting.skillName}`)
    console.log(`  Command: ${starting.command} ${(starting.args || []).join(" ")}`)
    
    const connected = skillConnected.find(c => c.skillName === starting.skillName)
    if (connected) {
      console.log(`[skillConnected] ${connected.skillName}`)
      console.log(`  Server: ${connected.serverInfo?.name} v${connected.serverInfo?.version}`)
      console.log(`  Spawn:      ${connected.spawnDurationMs}ms`)
      console.log(`  Handshake:  ${connected.handshakeDurationMs}ms`)
      console.log(`  Tools:      ${connected.toolDiscoveryDurationMs}ms`)
      console.log(`  Total:      ${connected.totalDurationMs}ms`)
    } else {
      console.log(`  ⚠️ NOT CONNECTED`)
    }

    const stderr = skillStderr.filter(s => s.skillName === starting.skillName)
    if (stderr.length > 0) {
      console.log(`  Stderr:`)
      for (const s of stderr) {
        // Parse server-side timing if available
        const initMatch = s.message.match(/initialized in (\d+)ms/)
        if (initMatch) {
          console.log(`    [SERVER INIT] ${initMatch[1]}ms`)
        } else if (!s.message.includes("npm notice")) {
          console.log(`    ${s.message}`)
        }
      }
    }
  }

  // Analyze tool calls
  console.log("\n\n=== TOOL CALLS ===")
  const callTools = events.filter(e => e.type === "callTools") as CallToolsEvent[]
  for (const call of callTools) {
    console.log(`\nStep ${call.stepNumber}:`)
    for (const tc of call.toolCalls || []) {
      console.log(`  [${tc.skillName}] ${tc.toolName}`)
    }
  }

  // Analyze completion
  console.log("\n\n=== COMPLETION ===")
  const complete = events.find(e => e.type === "completeRun") as CompleteRunEvent | undefined
  if (complete) {
    console.log(`Expert: ${complete.expertKey}`)
    if (complete.text) {
      console.log(`Result: ${complete.text.substring(0, 500)}...`)
    }
  }

  // Check for issues
  console.log("\n\n=== POTENTIAL ISSUES ===")
  
  // Check if attacker skill was connected
  const attackerConnected = skillConnected.find(c => c.skillName === "attacker")
  if (!attackerConnected) {
    console.log("❌ 'attacker' skill was NOT connected!")
  } else {
    console.log(`✓ 'attacker' skill connected after ${attackerConnected.totalDurationMs}ms`)
    if (attackerConnected.handshakeDurationMs > 3000) {
      console.log(`  ⚠️ Slow handshake: ${attackerConnected.handshakeDurationMs}ms`)
    }
  }

  // Check for symlink_attack tool usage
  const symlinkCalls = callTools.filter(c => 
    c.toolCalls?.some(tc => tc.toolName === "symlink_attack")
  )
  if (symlinkCalls.length === 0) {
    console.log("❌ symlink_attack tool was NEVER called!")
    console.log("   LLM may not have seen the tool in available tools list")
  } else {
    console.log(`✓ symlink_attack was called ${symlinkCalls.length} time(s)`)
  }

  // Print raw output for manual inspection
  console.log("\n\n=== RAW TEST OUTPUT (first 200 lines) ===")
  console.log(testOutput.slice(0, 200).join("\n"))
}

main().catch(console.error)

