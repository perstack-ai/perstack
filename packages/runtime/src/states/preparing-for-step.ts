import { finishAllToolCalls, type RunEvent, resumeToolCalls, startGeneration } from "@perstack/core"
import { createToolMessage } from "../messages/message.js"
import type { RunSnapshot } from "../runtime-state-machine.js"

export async function preparingForStepLogic({
  setting,
  checkpoint,
}: RunSnapshot["context"]): Promise<RunEvent> {
  if (checkpoint.pendingToolCalls && checkpoint.pendingToolCalls.length > 0) {
    return resumeToolCalls(setting, checkpoint, {
      pendingToolCalls: checkpoint.pendingToolCalls,
      partialToolResults: checkpoint.partialToolResults ?? [],
    })
  }
  if (checkpoint.partialToolResults && checkpoint.partialToolResults.length > 0) {
    const toolResultParts = checkpoint.partialToolResults.map((tr) => ({
      type: "toolResultPart" as const,
      toolCallId: tr.id,
      toolName: tr.toolName,
      contents: tr.result.filter(
        (part) =>
          part.type === "textPart" ||
          part.type === "imageInlinePart" ||
          part.type === "fileInlinePart",
      ),
    }))
    return finishAllToolCalls(setting, checkpoint, {
      newMessages: [createToolMessage(toolResultParts)],
    })
  }
  return startGeneration(setting, checkpoint, {
    messages: checkpoint.messages,
  })
}
