import type { Checkpoint } from "@perstack/core"

export function parseInteractiveToolCallResult(
  query: string,
  checkpoint: Checkpoint,
): {
  interactiveToolCallResult: {
    toolCallId: string
    toolName: string
    text: string
  }
} {
  const lastMessage = checkpoint.messages[checkpoint.messages.length - 1]
  if (lastMessage.type !== "expertMessage") {
    throw new Error("Last message is not a expert message")
  }
  const content = lastMessage.contents[0]
  if (content.type !== "toolCallPart") {
    throw new Error("Last message content is not a tool call part")
  }
  const toolCallId = content.toolCallId
  const toolName = content.toolName
  return {
    interactiveToolCallResult: {
      toolCallId,
      toolName,
      text: query,
    },
  }
}
