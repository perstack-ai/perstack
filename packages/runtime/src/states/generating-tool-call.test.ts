import { MockLanguageModelV2 } from "ai/test"
import { describe, expect, it, vi } from "vitest"
import { createCheckpoint, createRunSetting, createStep } from "../../test/run-params.js"
import { StateMachineLogics } from "../index.js"

const mockGetModel = vi.fn()
vi.mock("../model.js", async (importOriginal) => ({
  ...(await importOriginal()),
  getModel: () => mockGetModel(),
}))

const createMockLanguageModel = () => {
  return new MockLanguageModelV2({
    doGenerate: async () => ({
      content: [{ type: "text", text: "Generated text" }],
      warnings: [],
      finishReason: "stop" as const,
      usage: {
        inputTokens: 10,
        outputTokens: 20,
        reasoningTokens: 30,
        totalTokens: 60,
        cachedInputTokens: 40,
      },
      text: "Generated text",
      toolCalls: [],
    }),
  })
}

describe("@perstack/runtime: StateMachineLogic['GeneratingToolCall']", () => {
  it("handles tool call generation process", async () => {
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
    expect(event.expertKey).toBe("test-expert")
    expect(event.runId).toBe(setting.runId)
    expect(["retry", "generateRunResult", "callTool"]).toContain(event.type)
  })

  it("handles completion requests", async () => {
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
    expect(["retry", "generateRunResult"]).toContain(event.type)
    expect(event.expertKey).toBe("test-expert")
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
  })
})
