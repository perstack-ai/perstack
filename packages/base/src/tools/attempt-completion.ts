import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { dedent } from "ts-dedent"
import { errorToolResult, successToolResult } from "../lib/tool-result.js"
import { getRemainingTodos } from "./todo.js"

export type AttemptCompletionResult =
  | { remainingTodos: { id: number; title: string; completed: boolean }[] }
  | Record<string, never>

export async function attemptCompletion(): Promise<AttemptCompletionResult> {
  const remainingTodos = getRemainingTodos()
  if (remainingTodos.length > 0) {
    return { remainingTodos }
  }
  return {}
}

export function registerAttemptCompletion(server: McpServer) {
  server.registerTool(
    "attemptCompletion",
    {
      title: "Attempt completion",
      description: dedent`
      Task completion signal with automatic todo validation.
      Use cases:
      - Signaling task completion to Perstack runtime
      - Validating all todos are complete before ending
      - Ending the current expert's work cycle
      How it works:
      - Checks the current todo list for incomplete items
      - If incomplete todos exist: returns them and continues the agent loop
      - If no incomplete todos: returns empty object and ends the agent loop
      Notes:
      - Mark all todos as complete before calling
      - Use clearTodo if you want to reset and start fresh
      - Prevents premature completion by surfacing forgotten tasks
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
