import { createId } from "@paralleldrive/cuid2"
import { continueToNextStep, type RunEvent, stopRunByExceededMaxSteps } from "@perstack/core"
import type { RunSnapshot } from "../machine.js"

export async function finishingStepLogic({
  setting,
  checkpoint,
  step,
}: RunSnapshot["context"]): Promise<RunEvent> {
  if (setting.maxSteps !== undefined && checkpoint.stepNumber >= setting.maxSteps) {
    return stopRunByExceededMaxSteps(setting, checkpoint, {
      checkpoint: {
        ...checkpoint,
        status: "stoppedByExceededMaxSteps",
      },
      step: {
        ...step,
        finishedAt: Date.now(),
      },
    })
  }
  return continueToNextStep(setting, checkpoint, {
    checkpoint: {
      ...checkpoint,
    },
    step: {
      ...step,
      finishedAt: Date.now(),
    },
    nextCheckpoint: {
      ...checkpoint,
      id: createId(),
      stepNumber: checkpoint.stepNumber + 1,
    },
  })
}
