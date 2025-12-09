import { createId } from "@paralleldrive/cuid2"
import { describe, expect, it } from "vitest"
import { createCheckpoint, createRunSetting, createStep } from "../../test/run-params.js"
import { StateMachineLogics } from "../index.js"

describe("@perstack/runtime: StateMachineLogic['PreparingForStep']", () => {
  it("returns startGeneration when no pending tool calls or partial results", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep()
    await expect(
      StateMachineLogics.PreparingForStep({
        setting,
        checkpoint,
        step,
        eventListener: async () => {},
        skillManagers: {},
      }),
    ).resolves.toStrictEqual({
      type: "startGeneration",
      id: expect.any(String),
      expertKey: setting.expertKey,
      timestamp: expect.any(Number),
      jobId: setting.jobId,
      runId: setting.runId,
      stepNumber: checkpoint.stepNumber,
      messages: checkpoint.messages,
    })
  })

  it("returns resumeToolCalls when pendingToolCalls exist", async () => {
    const setting = createRunSetting()
    const pendingToolCalls = [
      { id: "tc_1", skillName: "test-skill", toolName: "testTool", args: {} },
    ]
    const partialToolResults = [
      { id: "tc_0", skillName: "test-skill", toolName: "prevTool", result: [] },
    ]
    const checkpoint = createCheckpoint({ pendingToolCalls, partialToolResults })
    const step = createStep()
    const result = await StateMachineLogics.PreparingForStep({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: {},
    })
    expect(result.type).toBe("resumeToolCalls")
    if (result.type === "resumeToolCalls") {
      expect(result.pendingToolCalls).toEqual(pendingToolCalls)
      expect(result.partialToolResults).toEqual(partialToolResults)
    }
  })

  it("returns finishAllToolCalls when only partialToolResults exist", async () => {
    const setting = createRunSetting()
    const partialToolResults = [
      {
        id: "tc_1",
        skillName: "test-skill",
        toolName: "testTool",
        result: [{ type: "textPart" as const, text: "result", id: createId() }],
      },
    ]
    const checkpoint = createCheckpoint({ partialToolResults })
    const step = createStep()
    const result = await StateMachineLogics.PreparingForStep({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: {},
    })
    expect(result.type).toBe("finishAllToolCalls")
    if (result.type === "finishAllToolCalls") {
      expect(result.newMessages).toHaveLength(1)
      expect(result.newMessages[0].type).toBe("toolMessage")
    }
  })

  it("filters partialToolResults contents to allowed types", async () => {
    const setting = createRunSetting()
    const partialToolResults = [
      {
        id: "tc_1",
        skillName: "test-skill",
        toolName: "testTool",
        result: [
          { type: "textPart" as const, text: "text", id: createId() },
          {
            type: "imageInlinePart" as const,
            encodedData: "base64",
            mimeType: "image/png",
            id: createId(),
          },
          {
            type: "fileInlinePart" as const,
            encodedData: "base64",
            mimeType: "application/pdf",
            id: createId(),
          },
        ],
      },
    ]
    const checkpoint = createCheckpoint({ partialToolResults })
    const step = createStep()
    const result = await StateMachineLogics.PreparingForStep({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: {},
    })
    expect(result.type).toBe("finishAllToolCalls")
    if (result.type === "finishAllToolCalls") {
      const toolMessage = result.newMessages[0]
      if (toolMessage.type === "toolMessage") {
        const toolResultPart = toolMessage.contents[0]
        if (toolResultPart.type === "toolResultPart") {
          expect(toolResultPart.contents).toHaveLength(3)
        }
      }
    }
  })
})
