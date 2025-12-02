import { createId } from "@paralleldrive/cuid2"
import { MockLanguageModelV2 } from "ai/test"
import { describe, expect, it, vi } from "vitest"
import { createCheckpoint, createRunSetting, createStep } from "../../test/run-params.js"
import { StateMachineLogics } from "../index.js"

const mockGetModel = vi.fn()
vi.mock("../model.js", async (importOriginal) => ({
  ...(await importOriginal()),
  getModel: () => mockGetModel(),
}))

const createMockLanguageModel = (response: string) => {
  return new MockLanguageModelV2({
    doGenerate: async () => ({
      content: [{ type: "text", text: response }],
      warnings: [],
      finishReason: "stop" as const,
      usage: {
        inputTokens: 10,
        outputTokens: 20,
        reasoningTokens: 30,
        totalTokens: 60,
        cachedInputTokens: 40,
      },
      text: response,
    }),
  })
}

describe("@perstack/runtime: StateMachineLogic['GeneratingRunResult']", () => {
  it("generates complete run event successfully", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep({
      toolCall: {
        id: "tc_123",
        skillName: "@perstack/base",
        toolName: "attemptCompletion",
        args: { result: "Complete" },
      },
      toolResult: {
        id: "tc_123",
        skillName: "@perstack/base",
        toolName: "attemptCompletion",
        result: [{ type: "textPart", text: "Task completed", id: createId() }],
      },
    })
    mockGetModel.mockReturnValue(createMockLanguageModel("Task completed successfully"))
    const event = await StateMachineLogics.GeneratingRunResult({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: {},
    })
    expect(event.type).toBe("completeRun")
    expect(event.expertKey).toBe("test-expert")
    expect(event.runId).toBe(setting.runId)
  })

  it("throws error when tool call or result missing", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep({ toolCall: undefined, toolResult: undefined })
    await expect(
      StateMachineLogics.GeneratingRunResult({
        setting,
        checkpoint,
        step,
        eventListener: async () => {},
        skillManagers: {},
      }),
    ).rejects.toThrow("No tool call or tool result found")
  })

  it("returns retry event on generation error", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep({
      toolCall: {
        id: "tc_123",
        skillName: "@perstack/base",
        toolName: "attemptCompletion",
        args: { result: "Complete" },
      },
      toolResult: {
        id: "tc_123",
        skillName: "@perstack/base",
        toolName: "attemptCompletion",
        result: [{ type: "textPart", text: "Task completed", id: createId() }],
      },
    })
    const errorModel = new MockLanguageModelV2({
      doGenerate: async () => {
        throw new Error("Generation failed")
      },
    })
    mockGetModel.mockReturnValue(errorModel)
    const event = await StateMachineLogics.GeneratingRunResult({
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
    const step = createStep({
      toolCall: {
        id: "tc_123",
        skillName: "@perstack/base",
        toolName: "attemptCompletion",
        args: { result: "Complete" },
      },
      toolResult: {
        id: "tc_123",
        skillName: "@perstack/base",
        toolName: "attemptCompletion",
        result: [{ type: "textPart", text: "Task completed", id: createId() }],
      },
    })
    mockGetModel.mockReturnValue(createMockLanguageModel("Final result"))
    const event = await StateMachineLogics.GeneratingRunResult({
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
