import { afterEach, describe, expect, it, vi } from "vitest"
import { attemptCompletion, registerAttemptCompletion } from "./attempt-completion.js"
import { clearTodo, todo } from "./todo.js"

describe("attemptCompletion tool", () => {
  afterEach(async () => {
    await clearTodo()
  })

  it("returns empty object when no todos exist", async () => {
    const result = await attemptCompletion()
    expect(result).toStrictEqual({})
  })

  it("returns empty object when all todos are completed", async () => {
    await todo({ newTodos: ["Task 1", "Task 2"] })
    await todo({ completedTodos: [0, 1] })
    const result = await attemptCompletion()
    expect(result).toStrictEqual({})
  })

  it("returns remaining todos when incomplete todos exist", async () => {
    await todo({ newTodos: ["Task 1", "Task 2", "Task 3"] })
    await todo({ completedTodos: [1] })
    const result = await attemptCompletion()
    expect(result).toStrictEqual({
      remainingTodos: [
        { id: 0, title: "Task 1", completed: false },
        { id: 2, title: "Task 3", completed: false },
      ],
    })
  })

  it("registers tool with correct metadata", () => {
    const mockServer = { registerTool: vi.fn() }
    registerAttemptCompletion(mockServer as never)
    expect(mockServer.registerTool).toHaveBeenCalledWith(
      "attemptCompletion",
      expect.objectContaining({ title: "Attempt completion" }),
      expect.any(Function),
    )
  })

  it("returns correct MCP response format", async () => {
    const mockServer = { registerTool: vi.fn() }
    registerAttemptCompletion(mockServer as never)
    const handler = mockServer.registerTool.mock.calls[0][2]
    const result = await handler({})
    expect(result).toStrictEqual({
      content: [{ type: "text", text: JSON.stringify({}) }],
    })
  })
})
