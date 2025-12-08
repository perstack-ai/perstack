#!/usr/bin/env npx tsx
import * as readline from "node:readline"

const pendingDrafts = new Map<string, string>()

function formatEvent(event: Record<string, unknown>): string | null {
  const type = event.type as string
  const expertKey = event.expertKey as string
  switch (type) {
    case "callTool": {
      const toolCall = event.toolCall as Record<string, unknown>
      const toolName = toolCall?.toolName as string
      const args = toolCall?.args as Record<string, unknown>
      if (toolName === "think") {
        const thought = args?.thought as string
        if (thought)
          return `[${expertKey}] 💭 ${thought.slice(0, 120)}${thought.length > 120 ? "..." : ""}`
      }
      if (toolName === "search_emails") {
        const query = args?.query as string
        if (query) return `[${expertKey}] 📧 Searching: ${query}`
      }
      if (toolName === "read_email" || toolName === "get_email") {
        return `[${expertKey}] 📨 Reading email...`
      }
      if (toolName === "draft_email") {
        const toolCallId = (event.toolCall as Record<string, unknown>)?.id as string
        const to = args?.to as string | string[]
        const threadId = (args?.threadId ?? args?.thread_id) as string
        const toStr = Array.isArray(to) ? to[0] : to
        if (threadId && toolCallId) pendingDrafts.set(toolCallId, threadId)
        let msg = `[${expertKey}] 📝 Creating Gmail draft${toStr ? ` to ${toStr}` : ""}`
        if (threadId) msg += ` (thread: ${threadId})`
        return msg
      }
      if (toolName === "send_email") {
        const to = args?.to as string
        return `[${expertKey}] 📤 Sending email${to ? ` to ${to}` : ""}...`
      }
      if (toolName === "readTextFile") {
        const path = args?.path as string
        if (path) return `[${expertKey}] 📖 Reading: ${path}`
      }
      if (toolName === "writeTextFile") {
        const path = args?.path as string
        if (path) return `[${expertKey}] ✏️ Writing: ${path}`
      }
      if (toolName === "editTextFile") {
        const path = args?.path as string
        if (path) return `[${expertKey}] ✏️ Editing: ${path}`
      }
      if (toolName === "listDirectory") {
        const path = args?.path as string
        if (path) return `[${expertKey}] 📁 Listing: ${path}`
      }
      if (toolName === "attemptCompletion") {
        return `[${expertKey}] ✨ Completing...`
      }
      if (
        toolName === "inbox-searcher" ||
        toolName === "knowledge-finder" ||
        toolName === "email-composer"
      ) {
        const query = args?.query as string
        if (query) return `[${expertKey}] 🔀 Delegating to ${toolName}: ${query.slice(0, 80)}...`
      }
      return `[${expertKey}] 🔧 ${toolName}`
    }
    case "resolveToolResult": {
      const toolResult = event.toolResult as Record<string, unknown>
      const toolName = toolResult?.toolName as string
      const toolCallId = toolResult?.id as string
      if (toolName === "draft_email") {
        const result = toolResult?.result as Array<Record<string, unknown>>
        const text = result?.[0]?.text as string
        const threadId = pendingDrafts.get(toolCallId)
        if (threadId) pendingDrafts.delete(toolCallId)
        if (text) {
          const match = text.match(/ID: (r[\d-]+)/)
          if (match) {
            console.log(`[${expertKey}] ✅ Draft saved: ${match[1]}`)
            if (threadId) {
              console.log(`[${expertKey}] 🔗 https://mail.google.com/mail/u/0/#inbox/${threadId}`)
            } else {
              console.log(`[${expertKey}] 🔗 https://mail.google.com/mail/u/0/#drafts`)
            }
          }
        }
      }
      return null
    }
    case "completeRun": {
      const text = (event as Record<string, unknown>).text as string
      if (text) {
        console.log(`\n${"=".repeat(60)}`)
        console.log("FINAL RESULT:")
        console.log("=".repeat(60))
        console.log(text)
        console.log("=".repeat(60))
      }
      return `[${expertKey}] ✅ Done`
    }
    case "startRun":
      return `[${expertKey}] 🚀 Starting...`
    default:
      return null
  }
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
    if (line.startsWith("[MCP]")) {
      console.log(line)
    }
  }
})
