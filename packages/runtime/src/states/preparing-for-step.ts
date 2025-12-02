import { type RunEvent, startGeneration } from "@perstack/core"
import type { RunSnapshot } from "../runtime-state-machine.js"

export async function preparingForStepLogic({
  setting,
  checkpoint,
}: RunSnapshot["context"]): Promise<RunEvent> {
  // TODO: add logic to count tokens and check if it's exceeded the limit
  return startGeneration(setting, checkpoint, {
    messages: checkpoint.messages,
  })
}
