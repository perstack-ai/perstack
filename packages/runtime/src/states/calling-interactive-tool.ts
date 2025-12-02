import { type RunEvent, stopRunByInteractiveTool } from "@perstack/core"
import type { RunSnapshot } from "../runtime-state-machine.js"

export async function callingInteractiveToolLogic({
  setting,
  checkpoint,
  step,
}: RunSnapshot["context"]): Promise<RunEvent> {
  return stopRunByInteractiveTool(setting, checkpoint, {
    checkpoint: {
      ...checkpoint,
      status: "stoppedByInteractiveTool",
    },
    step: {
      ...step,
      finishedAt: new Date().getTime(),
    },
  })
}
