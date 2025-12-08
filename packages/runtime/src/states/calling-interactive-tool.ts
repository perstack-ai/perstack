import { type RunEvent, stopRunByInteractiveTool } from "@perstack/core"
import type { RunSnapshot } from "../runtime-state-machine.js"

export async function callingInteractiveToolLogic({
  setting,
  checkpoint,
  step,
}: RunSnapshot["context"]): Promise<RunEvent> {
  if (!step.pendingToolCalls || step.pendingToolCalls.length === 0) {
    throw new Error("No pending tool calls found")
  }
  const currentToolCall = step.pendingToolCalls[0]
  const remainingToolCalls = step.pendingToolCalls.slice(1)
  return stopRunByInteractiveTool(setting, checkpoint, {
    checkpoint: {
      ...checkpoint,
      status: "stoppedByInteractiveTool",
      pendingToolCalls: [currentToolCall, ...remainingToolCalls],
      partialToolResults: step.partialToolResults,
    },
    step: {
      ...step,
      finishedAt: new Date().getTime(),
    },
  })
}
