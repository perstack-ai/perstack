import type { Checkpoint } from "@perstack/core"

export function parseInteractiveToolCallResult(
  query: string,
  checkpoint: Checkpoint,
): {
  interactiveToolCallResult: {
    toolCallId: string
    toolName: string
    skillName: string
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
  const pendingToolCall = checkpoint.pendingToolCalls?.find((tc) => tc.id === toolCallId)
  const skillName = pendingToolCall?.skillName ?? ""
  return {
    interactiveToolCallResult: {
      toolCallId,
      toolName,
      skillName,
      text: query,
    },
  }
}
