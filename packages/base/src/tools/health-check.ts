import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { dedent } from "ts-dedent"
import { workspacePath } from "../lib/path.js"
import { successToolResult } from "../lib/tool-result.js"

const startTime = Date.now()
export async function healthCheck() {
  const uptime = Math.floor((Date.now() - startTime) / 1000)
  const memoryUsage = process.memoryUsage()
  return {
    status: "ok",
    workspace: workspacePath,
    uptime: `${uptime}s`,
    memory: {
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
    },
    pid: process.pid,
  }
}

export function registerHealthCheck(server: McpServer) {
  server.registerTool(
    "healthCheck",
    {
      title: "Health Check",
      description: dedent`
        Returns MCP server health status and diagnostics.
        Use cases:
        - Verify MCP server is running and responsive
        - Check workspace configuration
        - Monitor server uptime and memory usage
        How it works:
        - Returns server status, workspace path, uptime, and memory usage
        - Always returns "ok" status if server can respond
        - Useful for debugging connection issues
        Notes:
        - This is a diagnostic tool for the MCP server itself
        - Does not access or modify files
      `,
      inputSchema: {},
    },
    async () => successToolResult(await healthCheck()),
  )
}
