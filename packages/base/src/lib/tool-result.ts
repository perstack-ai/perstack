import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"

export function successToolResult(result: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(result) }] }
}

export function errorToolResult(e: Error): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify({ error: e.name, message: e.message }) }],
  }
}
