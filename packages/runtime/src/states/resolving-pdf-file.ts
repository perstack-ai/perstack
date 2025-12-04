import { readFile } from "node:fs/promises"
import { type FileInlinePart, type RunEvent, type TextPart, finishToolCall } from "@perstack/core"
import { createToolMessage, createUserMessage } from "../messages/message.js"
import type { RunSnapshot } from "../runtime-state-machine.js"

type ReadPdfFileResult = { path: string; mimeType: string; size: number }
export async function resolvingPdfFileLogic({
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
  const files: (Omit<FileInlinePart, "id"> | Omit<TextPart, "id">)[] = []
  for (const textPart of textParts) {
    let pdfInfo: ReadPdfFileResult | undefined
    try {
      pdfInfo = JSON.parse(textPart.text) as ReadPdfFileResult
    } catch {
      files.push({
        type: "textPart",
        text: textPart.text,
      })
      continue
    }
    const { path, mimeType, size } = pdfInfo
    try {
      const buffer = await readFile(path)
      files.push({
        type: "fileInlinePart",
        encodedData: buffer.toString("base64"),
        mimeType,
      })
    } catch (error) {
      files.push({
        type: "textPart",
        text: `Failed to read PDF file "${path}": ${error instanceof Error ? error.message : String(error)}`,
      })
    }
  }
  return finishToolCall(setting, checkpoint, {
    newMessages: [
      createToolMessage([
        {
          type: "toolResultPart",
          toolCallId: id,
          toolName,
          contents: [
            {
              type: "textPart",
              text: "User uploads PDF file as follows.",
            },
          ],
        },
      ]),
      createUserMessage(files),
    ],
  })
}
