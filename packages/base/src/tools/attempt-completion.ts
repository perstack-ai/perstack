import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { dedent } from "ts-dedent"
import { errorToolResult, successToolResult } from "../lib/tool-result.js"
export async function attemptCompletion() {
  return {
    message: "End the agent loop and provide a final report",
  }
}

export function registerAttemptCompletion(server: McpServer) {
  server.registerTool(
    "attemptCompletion",
    {
      title: "Attempt completion",
      description: dedent`
      Task completion signal that triggers immediate final report generation.
      Use cases:
      - Signaling task completion to Perstack runtime
      - Triggering final report generation
      - Ending the current expert's work cycle
      How it works:
      - Sends completion signal to Perstack runtime
      - Runtime immediately proceeds to final report generation
      - No confirmation or approval step required
      - No parameters needed for this signal
      Notes:
      - Triggers immediate transition to final report
      - Should only be used when task is fully complete
      - Cannot be reverted once called
    `,
      inputSchema: {},
    },
    async () => {
      try {
        return successToolResult(await attemptCompletion())
      } catch (e) {
        if (e instanceof Error) return errorToolResult(e)
        throw e
      }
    },
  )
}
