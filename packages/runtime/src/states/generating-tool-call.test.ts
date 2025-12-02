import { MockLanguageModelV2 } from "ai/test"
import { describe, expect, it, vi } from "vitest"
import { createCheckpoint, createRunSetting, createStep } from "../../test/run-params.js"
import { StateMachineLogics } from "../index.js"

const mockGetModel = vi.fn()
vi.mock("../model.js", async (importOriginal) => ({
  ...(await importOriginal()),
  getModel: () => mockGetModel(),
}))

function createMockLanguageModel(
  options: {
    finishReason?: "stop" | "tool-calls" | "length" | "error"
    text?: string
    shouldError?: boolean
  } = {},
) {
  const { finishReason = "stop", text = "Generated text", shouldError = false } = options
  return new MockLanguageModelV2({
    doGenerate: async () => {
      if (shouldError) {
        throw new Error("Model generation failed")
      }
      return {
        content: text ? [{ type: "text", text }] : [],
        warnings: [],
        finishReason,
        usage: {
          inputTokens: 10,
          outputTokens: 20,
          reasoningTokens: 30,
          totalTokens: 60,
          cachedInputTokens: 40,
        },
        text,
        toolCalls: [],
      }
    },
  })
}

describe("@perstack/runtime: StateMachineLogic['GeneratingToolCall']", () => {
  it("returns retry event when no tool call generated", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep()
    mockGetModel.mockReturnValue(createMockLanguageModel())
    const event = await StateMachineLogics.GeneratingToolCall({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: {},
    })
    expect(event.type).toBe("retry")
    expect(event.expertKey).toBe("test-expert")
  })

  it("returns retry event on generation error", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep()
    mockGetModel.mockReturnValue(createMockLanguageModel({ shouldError: true }))
    const event = await StateMachineLogics.GeneratingToolCall({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: {},
    })
    expect(event.type).toBe("retry")
  })

  it("includes proper event metadata", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep()
    mockGetModel.mockReturnValue(createMockLanguageModel())
    const event = await StateMachineLogics.GeneratingToolCall({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: {},
    })
    expect(event.id).toBeDefined()
    expect(typeof event.id).toBe("string")
    expect(event.runId).toBe(setting.runId)
  })

  it("handles different finish reasons", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep()
    mockGetModel.mockReturnValue(createMockLanguageModel({ finishReason: "stop" }))
    const event = await StateMachineLogics.GeneratingToolCall({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: {},
    })
    expect(event.type).toBe("retry")
    expect(event.runId).toBe(setting.runId)
  })

  it("returns retry with usage information", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep()
    mockGetModel.mockReturnValue(createMockLanguageModel())
    const event = await StateMachineLogics.GeneratingToolCall({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: {},
    })
    expect(event.type).toBe("retry")
    expect((event as { usage?: { inputTokens: number } }).usage).toBeDefined()
  })
})
