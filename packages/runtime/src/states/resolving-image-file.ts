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
  if (!step.toolCall || !step.toolResult) {
    throw new Error("No tool call or tool result found")
  }
  const { id, toolName } = step.toolCall
  const { result } = step.toolResult
  const textParts = result.filter((part) => part.type === "textPart")
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
    const { path, mimeType, size } = imageInfo
    const file = await readFile(path).then((buffer) => ({
      encodedData: buffer.toString("base64"),
      mimeType,
      size,
    }))
    files.push({
      type: "imageInlinePart",
      encodedData: file.encodedData,
      mimeType: file.mimeType,
    })
  }
  return finishToolCall(setting, checkpoint, {
    newMessages: [
      createToolMessage([
        {
          type: "toolResultPart",
          toolCallId: id,
          toolName,
          contents: files,
        },
      ]),
    ],
  })
}
