import { createId } from "@paralleldrive/cuid2"
import { type RunEvent, continueToNextStep, stopRunByExceededMaxSteps } from "@perstack/core"
import type { RunSnapshot } from "../runtime-state-machine.js"

export async function finishingStepLogic({
  setting,
  checkpoint,
  step,
}: RunSnapshot["context"]): Promise<RunEvent> {
  if (setting.maxSteps !== undefined && checkpoint.stepNumber > setting.maxSteps) {
    return stopRunByExceededMaxSteps(setting, checkpoint, {
      checkpoint: {
        ...checkpoint,
        status: "stoppedByExceededMaxSteps",
      },
      step: {
        ...step,
        finishedAt: new Date().getTime(),
      },
    })
  }
  return continueToNextStep(setting, checkpoint, {
    checkpoint: {
      ...checkpoint,
    },
    step: {
      ...step,
      finishedAt: new Date().getTime(),
    },
    nextCheckpoint: {
      ...checkpoint,
      id: createId(),
      stepNumber: checkpoint.stepNumber + 1,
    },
  })
}
