import { readFile } from "node:fs/promises"
import { type ImageInlinePart, type RunEvent, type TextPart, finishToolCall } from "@perstack/core"
import { createToolMessage } from "../messages/message.js"
import type { RunSnapshot } from "../runtime-state-machine.js"

type ReadImageFileResult = { path: string; mimeType: string; size: number }
export async function resolvingImageFileLogic({
  setting,
  checkpoint,
  step,
}: RunSnapshot["context"]): Promise<RunEvent> {
  if (!step.toolCalls || !step.toolResults || step.toolResults.length === 0) {
    throw new Error("No tool calls or tool results found")
  }
  const toolResult = step.toolResults[0]
  if (!toolResult) {
    throw new Error("No tool result found")
  }
  const toolCall = step.toolCalls.find((tc) => tc.id === toolResult.id)
  const { result } = toolResult
  const textParts = result.filter((part): part is TextPart => part.type === "textPart")
  const files: (Omit<ImageInlinePart, "id"> | Omit<TextPart, "id">)[] = []
  for (const textPart of textParts) {
    let imageInfo: ReadImageFileResult | undefined
    try {
      imageInfo = JSON.parse(textPart.text) as ReadImageFileResult
    } catch {
      files.push({
        type: "textPart",
        text: textPart.text,
      })
      continue
    }
    const { path, mimeType } = imageInfo
    try {
      const buffer = await readFile(path)
      files.push({
        type: "imageInlinePart",
        encodedData: buffer.toString("base64"),
        mimeType,
      })
    } catch (error) {
      files.push({
        type: "textPart",
        text: `Failed to read image file "${path}": ${error instanceof Error ? error.message : String(error)}`,
      })
    }
  }
  return finishToolCall(setting, checkpoint, {
    newMessages: [
      createToolMessage([
        {
          type: "toolResultPart",
          toolCallId: toolResult.id,
          toolName: toolCall?.toolName ?? toolResult.toolName,
          contents: files,
        },
      ]),
    ],
  })
}
