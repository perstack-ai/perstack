import { describe, expect, it } from "vitest"
import { createCheckpoint, createRunSetting, createStep } from "../../test/run-params.js"
import { StateMachineLogics } from "../runtime-state-machine.js"

describe("@perstack/runtime: StateMachineLogic['FinishingStep']", () => {
  it("finishes steps correctly when within max steps", async () => {
    const setting = createRunSetting({ maxSteps: 5 })
    const checkpoint = createCheckpoint({ stepNumber: 2 })
    const step = createStep({ stepNumber: 2 })
    await expect(
      StateMachineLogics.FinishingStep({
        setting,
        checkpoint,
        step,
        eventListener: async () => {},
        skillManagers: {},
      }),
    ).resolves.toStrictEqual({
      type: "continueToNextStep",
      id: expect.any(String),
      expertKey: setting.expertKey,
      timestamp: expect.any(Number),
      runId: setting.runId,
      stepNumber: checkpoint.stepNumber,
      checkpoint: {
        ...checkpoint,
      },
      step: {
        ...step,
        finishedAt: expect.any(Number),
      },
      nextCheckpoint: {
        ...checkpoint,
        id: expect.any(String),
        stepNumber: checkpoint.stepNumber + 1,
      },
    })
  })

  it("stops when max steps exceeded", async () => {
    const setting = createRunSetting({ maxSteps: 3 })
    const checkpoint = createCheckpoint({ stepNumber: 4 })
    const step = createStep({ stepNumber: 4 })
    await expect(
      StateMachineLogics.FinishingStep({
        setting,
        checkpoint,
        step,
        eventListener: async () => {},
        skillManagers: {},
      }),
    ).resolves.toStrictEqual({
      type: "stopRunByExceededMaxSteps",
      id: expect.any(String),
      expertKey: setting.expertKey,
      timestamp: expect.any(Number),
      runId: setting.runId,
      stepNumber: checkpoint.stepNumber,
      checkpoint: {
        ...checkpoint,
        status: "stoppedByExceededMaxSteps",
      },
      step: {
        ...step,
        finishedAt: expect.any(Number),
      },
    })
  })
})
