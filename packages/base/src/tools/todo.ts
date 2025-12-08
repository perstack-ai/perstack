import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { dedent } from "ts-dedent"
import { z } from "zod/v4"
import { errorToolResult, successToolResult } from "../lib/tool-result.js"

class Todo {
  currentTodoId = 0
  todos: { id: number; title: string; completed: boolean }[] = []
  public processTodo(input: { newTodos?: string[]; completedTodos?: number[] }) {
    const { newTodos, completedTodos } = input
    if (newTodos) {
      this.todos.push(
        ...newTodos.map((title) => ({ id: this.currentTodoId++, title, completed: false })),
      )
    }
    if (completedTodos) {
      this.todos = this.todos.map((todo) => ({
        ...todo,
        completed: todo.completed || completedTodos.includes(todo.id),
      }))
    }
    return {
      todos: this.todos,
    }
  }
  public clearTodo() {
    this.todos = []
    this.currentTodoId = 0
    return {
      todos: this.todos,
    }
  }
}
const todoSingleton = new Todo()
export async function todo(input: { newTodos?: string[]; completedTodos?: number[] }) {
  return todoSingleton.processTodo(input)
}
export async function clearTodo() {
  return todoSingleton.clearTodo()
}
export function getRemainingTodos() {
  return todoSingleton.todos.filter((t) => !t.completed)
}

export function registerTodo(server: McpServer) {
  server.registerTool(
    "todo",
    {
      title: "todo",
      description: dedent`
        Todo list manager that tracks tasks and their completion status.

        Use cases:
        - Creating new tasks or action items
        - Marking tasks as completed
        - Viewing current task list and status

        How it works:
        - Each todo gets a unique ID when created
        - Returns the full todo list after every operation
        - Maintains state across multiple calls

        Parameters:
        - newTodos: Array of task descriptions to add
        - completedTodos: Array of todo IDs to mark as completed
      `,
      inputSchema: {
        newTodos: z.array(z.string()).describe("New todos to add").optional(),
        completedTodos: z.array(z.number()).describe("Todo ids that are completed").optional(),
      },
    },
    async (input: { newTodos?: string[]; completedTodos?: number[] }) => {
      try {
        return successToolResult(await todo(input))
      } catch (e) {
        if (e instanceof Error) return errorToolResult(e)
        throw e
      }
    },
  )
}

export function registerClearTodo(server: McpServer) {
  server.registerTool(
    "clearTodo",
    {
      title: "clearTodo",
      description: dedent`
        Clears the todo list.

        Use cases:
        - Resetting the todo list to an empty state
        - Starting fresh with a new task list
        - Clearing all tasks for a new day or project

        How it works:
        - Resets the todo list to an empty state
        - Returns an empty todo list
      `,
      inputSchema: {},
    },
    async () => {
      try {
        return successToolResult(await clearTodo())
      } catch (e) {
        if (e instanceof Error) return errorToolResult(e)
        throw e
      }
    },
  )
}
