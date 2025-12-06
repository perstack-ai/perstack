#!/usr/bin/env npx tsx
import * as readline from "readline"

const COMMENT_ID = process.env.COMMENT_ID
const GITHUB_REPO = process.env.GITHUB_REPO
const GH_TOKEN = process.env.GH_TOKEN

if (!COMMENT_ID || !GITHUB_REPO || !GH_TOKEN) {
  console.error("Missing required env vars: COMMENT_ID, GITHUB_REPO, GH_TOKEN")
  process.exit(1)
}

const logs: string[] = []
let finalAnswer = ""
let updatePending = false

async function updateComment() {
  if (updatePending) return
  updatePending = true
  await new Promise((resolve) => setTimeout(resolve, 500))
  updatePending = false
  let body: string
  if (finalAnswer) {
    body = `${finalAnswer}

---

<details>
<summary>🤖 Bot Activity</summary>

\`\`\`
${logs.join("\n")}
\`\`\`

</details>`
  } else {
    body = `<details open>
<summary>🤖 Processing...</summary>

\`\`\`
${logs.join("\n")}
\`\`\`

</details>`
  }
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/issues/comments/${COMMENT_ID}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${GH_TOKEN}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.github+json",
        },
        body: JSON.stringify({ body }),
      }
    )
    if (!res.ok) {
      console.error("Failed to update comment:", await res.text())
    }
  } catch (e) {
    console.error("Error updating comment:", e)
  }
}

function formatEvent(event: Record<string, unknown>): string | null {
  const type = event.type as string
  switch (type) {
    case "callTool": {
      const toolCall = event.toolCall as Record<string, unknown>
      const toolName = toolCall?.toolName as string
      const args = toolCall?.args as Record<string, unknown>
      if (toolName === "think") {
        const thought = args?.thought as string
        if (thought) return `💭 ${thought.slice(0, 100)}${thought.length > 100 ? "..." : ""}`
      }
      if (toolName === "todo") {
        return `📋 Updating todo list...`
      }
      if (toolName === "readTextFile") {
        const path = args?.path as string
        if (path) return `📖 Reading: ${path}`
      }
      if (toolName === "listDirectory") {
        const path = args?.path as string
        if (path) return `📁 Listing: ${path}`
      }
      if (toolName === "exec") {
        const command = args?.command as string
        const cmdArgs = args?.args as string[]
        if (command) return `⚡ Exec: ${command} ${(cmdArgs || []).slice(0, 3).join(" ")}`
      }
      if (toolName === "attemptCompletion") {
        return "✨ Generating answer..."
      }
      return null
    }
    case "completeRun": {
      const text = (event as Record<string, unknown>).text as string
      if (text) finalAnswer = text
      return "✅ Done"
    }
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
  process.stdout.write(line + "\n")
  try {
    const event = JSON.parse(line) as Record<string, unknown>
    const formatted = formatEvent(event)
    if (formatted) {
      logs.push(formatted)
      updateComment()
    }
  } catch {
    // Not JSON, pass through
  }
})

rl.on("close", async () => {
  logs.push("---")
  await updateComment()
})
