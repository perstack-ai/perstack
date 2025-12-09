import { describe, expect, it } from "vitest"
import { createCheckpoint, createRunSetting, createStep } from "../../test/run-params.js"
import { StateMachineLogics } from "../index.js"

describe("@perstack/runtime: StateMachineLogic['CallingInteractiveTool']", () => {
  it("handles interactive tool calls correctly", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep({
      pendingToolCalls: [
        {
          id: "tc_interactive_123",
          skillName: "interactive",
          toolName: "humanApproval",
          args: { message: "Please approve this action" },
        },
      ],
    })
    await expect(
      StateMachineLogics.CallingInteractiveTool({
        setting,
        checkpoint,
        step,
        eventListener: async () => {},
        skillManagers: {},
      }),
    ).resolves.toStrictEqual({
      type: "stopRunByInteractiveTool",
      id: expect.any(String),
      expertKey: setting.expertKey,
      timestamp: expect.any(Number),
      jobId: setting.jobId,
      runId: setting.runId,
      stepNumber: checkpoint.stepNumber,
      checkpoint: {
        ...checkpoint,
        status: "stoppedByInteractiveTool",
        pendingToolCalls: [
          {
            id: "tc_interactive_123",
            skillName: "interactive",
            toolName: "humanApproval",
            args: { message: "Please approve this action" },
          },
        ],
        partialToolResults: undefined,
      },
      step: {
        ...step,
        finishedAt: expect.any(Number),
      },
    })
  })

  it("throws error when pendingToolCalls is empty", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep({ pendingToolCalls: [] })
    await expect(
      StateMachineLogics.CallingInteractiveTool({
        setting,
        checkpoint,
        step,
        eventListener: async () => {},
        skillManagers: {},
      }),
    ).rejects.toThrow("No pending tool calls found")
  })

  it("throws error when pendingToolCalls is undefined", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep({ pendingToolCalls: undefined })
    await expect(
      StateMachineLogics.CallingInteractiveTool({
        setting,
        checkpoint,
        step,
        eventListener: async () => {},
        skillManagers: {},
      }),
    ).rejects.toThrow("No pending tool calls found")
  })

  it("preserves remaining tool calls in pendingToolCalls", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const step = createStep({
      pendingToolCalls: [
        { id: "tc_1", skillName: "interactive", toolName: "tool1", args: {} },
        { id: "tc_2", skillName: "interactive", toolName: "tool2", args: {} },
      ],
    })
    const result = await StateMachineLogics.CallingInteractiveTool({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: {},
    })
    expect(result.type).toBe("stopRunByInteractiveTool")
    if (result.type === "stopRunByInteractiveTool") {
      expect(result.checkpoint.pendingToolCalls).toHaveLength(2)
      expect(result.checkpoint.pendingToolCalls?.[0]?.id).toBe("tc_1")
      expect(result.checkpoint.pendingToolCalls?.[1]?.id).toBe("tc_2")
    }
  })

  it("preserves partialToolResults in checkpoint", async () => {
    const setting = createRunSetting()
    const checkpoint = createCheckpoint()
    const partialToolResults = [{ id: "tc_0", skillName: "mcp", toolName: "prevTool", result: [] }]
    const step = createStep({
      pendingToolCalls: [{ id: "tc_1", skillName: "interactive", toolName: "tool1", args: {} }],
      partialToolResults,
    })
    const result = await StateMachineLogics.CallingInteractiveTool({
      setting,
      checkpoint,
      step,
      eventListener: async () => {},
      skillManagers: {},
    })
    expect(result.type).toBe("stopRunByInteractiveTool")
    if (result.type === "stopRunByInteractiveTool") {
      expect(result.checkpoint.partialToolResults).toEqual(partialToolResults)
    }
  })
})
