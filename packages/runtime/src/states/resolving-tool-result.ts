import { type RunEvent, finishToolCall } from "@perstack/core"
import { createToolMessage } from "../messages/message.js"
import type { RunSnapshot } from "../runtime-state-machine.js"

export async function resolvingToolResultLogic({
  setting,
  checkpoint,
  step,
}: RunSnapshot["context"]): Promise<RunEvent> {
  if (!step.toolCall || !step.toolResult) {
    throw new Error("No tool call or tool result found")
  }
  const { id, toolName } = step.toolCall
  const { result } = step.toolResult
  return finishToolCall(setting, checkpoint, {
    newMessages: [
      createToolMessage([
        {
          type: "toolResultPart",
          toolCallId: id,
          toolName,
          contents: result.filter(
            (part) => part.type === "textPart" || part.type === "imageInlinePart",
          ),
        },
      ]),
    ],
  })
}
