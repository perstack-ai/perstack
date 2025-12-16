import * as readline from "node:readline"

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
})
rl.on("line", (line: string) => {
  try {
    const event = JSON.parse(line)
    const type = event.type as string
    switch (type) {
      case "startRun":
        console.log(`[START] ${event.expertKey}`)
        break
      case "callTool": {
        const toolCall = event.toolCall as Record<string, unknown>
        const toolName = toolCall?.toolName as string
        const args = toolCall?.args as Record<string, unknown>
        if (toolName === "think") {
          const thought = (args?.thought as string) || ""
          console.log(`[THINK] ${thought.slice(0, 100)}...`)
        } else if (toolName === "listDirectory") {
          console.log(`[LIST] ${args?.path}`)
        } else if (toolName === "readTextFile") {
          console.log(`[READ] ${args?.path}`)
        } else if (toolName === "getFileInfo") {
          console.log(`[INFO] ${args?.path}`)
        } else if (toolName === "attemptCompletion") {
          const result = (args?.result as string) || ""
          console.log(`[COMPLETE]\n${result}`)
        } else {
          console.log(`[TOOL] ${toolName}`)
        }
        break
      }
      case "completeRun":
        console.log(`[DONE] ${(event.text as string)?.slice(0, 200)}...`)
        break
      case "failRun":
        console.log(`[FAIL] ${event.error}`)
        break
      case "errorRun":
        console.log(`[ERROR] ${JSON.stringify(event.error)}`)
        break
      case "toolResult": {
        const result = event.result as Record<string, unknown>
        if (result?.isError) {
          console.log(`[TOOL_ERROR] ${JSON.stringify(result)}`)
        }
        break
      }
      default:
        break
    }
  } catch {
    if (line.trim()) {
      console.log(`[RAW] ${line.slice(0, 100)}`)
    }
  }
})
