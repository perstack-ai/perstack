import { afterEach, describe, expect, it } from "vitest"
import { clearTodo, todo } from "./todo.js"

describe("todo tool", () => {
  afterEach(() => {
    clearTodo()
  })

  describe("todo functionality", () => {
    it("adds new todos", async () => {
      const result = await todo({ newTodos: ["Task 1", "Task 2"] })
      expect(result).toStrictEqual({
        todos: [
          { id: 0, title: "Task 1", completed: false },
          { id: 1, title: "Task 2", completed: false },
        ],
      })
    })

    it("completes todos by ID", async () => {
      await todo({ newTodos: ["Task 1", "Task 2"] })
      const result = await todo({ completedTodos: [0] })
      expect(result).toStrictEqual({
        todos: [
          { id: 0, title: "Task 1", completed: true },
          { id: 1, title: "Task 2", completed: false },
        ],
      })
    })

    it("adds and completes todos in same operation", async () => {
      await todo({ newTodos: ["Task 1"] })
      const result = await todo({
        newTodos: ["Task 2"],
        completedTodos: [0],
      })
      expect(result).toStrictEqual({
        todos: [
          { id: 0, title: "Task 1", completed: true },
          { id: 1, title: "Task 2", completed: false },
        ],
      })
    })

    it("handles empty operations", async () => {
      const result = await todo({})
      expect(result).toStrictEqual({
        todos: [],
      })
    })

    it("maintains state across multiple operations", async () => {
      await todo({ newTodos: ["Task 1"] })
      await todo({ newTodos: ["Task 2"] })
      const result = await todo({ newTodos: ["Task 3"] })
      expect(result).toStrictEqual({
        todos: [
          { id: 0, title: "Task 1", completed: false },
          { id: 1, title: "Task 2", completed: false },
          { id: 2, title: "Task 3", completed: false },
        ],
      })
    })

    it("assigns unique IDs to todos", async () => {
      const result = await todo({ newTodos: ["Task 1", "Task 2", "Task 3"] })
      const ids = result.todos.map((t) => t.id)
      expect(ids).toEqual([0, 1, 2])
      expect(new Set(ids).size).toBe(3)
    })

    it("ignores invalid completion IDs", async () => {
      await todo({ newTodos: ["Task 1"] })
      const result = await todo({ completedTodos: [99] })
      expect(result.todos[0].completed).toBe(false)
    })
  })

  describe("clearTodo functionality", () => {
    it("clears the todo list", async () => {
      await todo({ newTodos: ["Task 1"] })
      const result = await clearTodo()
      expect(result).toStrictEqual({ todos: [] })
    })
  })
})
