#!/usr/bin/env npx tsx
import * as readline from "readline"

const importantTypes = new Set([
  "startRun",
  "endRun",
  "completeRun",
  "callTools",
  "error",
  "attemptCompletion",
])

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
})

rl.on("line", (line) => {
  if (!line.trim()) return
  try {
    const event = JSON.parse(line)
    if (importantTypes.has(event.type)) {
      if (event.type === "callTools") {
        const tools = event.toolCalls?.map((tc: { toolName: string }) => tc.toolName) ?? []
        console.log(`[${event.stepNumber}] ${event.type}: ${tools.join(", ")}`)
      } else if (event.type === "error") {
        console.log(`[ERROR] ${JSON.stringify(event)}`)
      } else if (event.type === "completeRun") {
        const text = event.text?.slice(0, 300) ?? ""
        console.log(`[${event.stepNumber}] ${event.type}: ${text}...`)
      } else {
        console.log(`[${event.stepNumber ?? "-"}] ${event.type}`)
      }
    }
  } catch {
    if (line.includes("error") || line.includes("Error")) {
      console.log(`[parse error] ${line.slice(0, 200)}...`)
    }
  }
})
