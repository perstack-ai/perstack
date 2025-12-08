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
      runId: setting.runId,
      stepNumber: checkpoint.stepNumber,
      checkpoint: {
        ...checkpoint,
        status: "stoppedByInteractiveTool",
        pendingToolCalls: undefined,
        partialToolResults: undefined,
      },
      step: {
        ...step,
        finishedAt: expect.any(Number),
      },
    })
  })
})
