import { type RunEvent, finishToolCall } from "@perstack/core"
import { createToolMessage } from "../messages/message.js"
import type { RunSnapshot } from "../runtime-state-machine.js"

export async function resolvingToolResultLogic({
  setting,
  checkpoint,
  step,
}: RunSnapshot["context"]): Promise<RunEvent> {
  if (!step.toolCalls || !step.toolResults || step.toolResults.length === 0) {
    throw new Error("No tool calls or tool results found")
  }
  const toolResultParts = step.toolResults.map((toolResult) => {
    const toolCall = step.toolCalls?.find((tc) => tc.id === toolResult.id)
    return {
      type: "toolResultPart" as const,
      toolCallId: toolResult.id,
      toolName: toolCall?.toolName ?? toolResult.toolName,
      contents: toolResult.result.filter(
        (part) =>
          part.type === "textPart" ||
          part.type === "imageInlinePart" ||
          part.type === "fileInlinePart",
      ),
    }
  })
  return finishToolCall(setting, checkpoint, {
    newMessages: [createToolMessage(toolResultParts)],
  })
}
