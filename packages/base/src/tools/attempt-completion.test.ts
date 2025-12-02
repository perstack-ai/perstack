import { describe, expect, it, vi } from "vitest"
import { registerAttemptCompletion } from "./attempt-completion.js"

describe("attemptCompletion tool", () => {
  it("returns consistent completion message", async () => {
    const mockServer = { registerTool: vi.fn() }
    registerAttemptCompletion(mockServer as never)
    expect(mockServer.registerTool).toHaveBeenCalledWith(
      "attemptCompletion",
      expect.objectContaining({ title: "Attempt completion" }),
      expect.any(Function),
    )
    const handler = mockServer.registerTool.mock.calls[0][2]
    const result = await handler({})
    expect(result).toStrictEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            message: "End the agent loop and provide a final report",
          }),
        },
      ],
    })
  })
})
