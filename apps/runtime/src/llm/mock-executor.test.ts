import { describe, expect, it } from "vitest"
import { createMockLLMExecutor, MockLLMExecutor } from "./mock-executor.js"

describe("MockLLMExecutor", () => {
  it("returns default success response", async () => {
    const mock = new MockLLMExecutor()

    const result = await mock.generateText({
      messages: [],
      temperature: 0.7,
      maxRetries: 3,
      tools: {},
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.result.finishReason).toBe("stop")
    }
  })

  it("returns custom response when set", async () => {
    const mock = new MockLLMExecutor()
    const customResult = {
      success: true as const,
      result: { text: "Custom" } as never,
    }
    mock.setMockResult(customResult)

    const result = await mock.generateText({
      messages: [],
      temperature: 0.7,
      maxRetries: 3,
      tools: {},
    })

    expect(result).toEqual(customResult)
  })

  it("generateTextWithoutTools delegates to generateText", async () => {
    const mock = new MockLLMExecutor()

    const result = await mock.generateTextWithoutTools({
      messages: [],
      temperature: 0.7,
      maxRetries: 3,
    })

    expect(result.success).toBe(true)
  })
})

describe("createMockLLMExecutor", () => {
  it("creates a MockLLMExecutor instance", () => {
    const mock = createMockLLMExecutor()
    expect(mock).toBeInstanceOf(MockLLMExecutor)
  })
})
