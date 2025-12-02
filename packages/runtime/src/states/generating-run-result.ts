import { type RunEvent, completeRun, retry } from "@perstack/core"
import { type GenerateTextResult, type ToolSet, generateText } from "ai"
import {
  createExpertMessage,
  createToolMessage,
  createUserMessage,
  messageToCoreMessage,
} from "../messages/message.js"
import { calculateContextWindowUsage, getModel } from "../model.js"
import type { RunSnapshot } from "../runtime-state-machine.js"
import { createEmptyUsage, sumUsage, usageFromGenerateTextResult } from "../usage.js"

export async function generatingRunResultLogic({
  setting,
  checkpoint,
  step,
}: RunSnapshot["context"]): Promise<RunEvent> {
  if (!step.toolCall || !step.toolResult) {
    throw new Error("No tool call or tool result found")
  }
  const { id, toolName } = step.toolCall
  const { result } = step.toolResult
  const toolMessage = createToolMessage([
    {
      type: "toolResultPart",
      toolCallId: id,
      toolName,
      contents: result.filter(
        (part) => part.type === "textPart" || part.type === "imageInlinePart",
      ),
    },
  ])
  const model = getModel(setting.model, setting.providerConfig)
  const { messages } = checkpoint
  let generationResult: GenerateTextResult<ToolSet, never>
  try {
    generationResult = await generateText({
      model,
      messages: [...messages, toolMessage].map(messageToCoreMessage),
      temperature: setting.temperature,
      maxRetries: setting.maxRetries,
      abortSignal: AbortSignal.timeout(setting.timeout),
    })
  } catch (error) {
    if (error instanceof Error) {
      const reason = JSON.stringify({ error: error.name, message: error.message })
      return retry(setting, checkpoint, {
        reason,
        newMessages: [toolMessage, createUserMessage([{ type: "textPart", text: reason }])],
        usage: createEmptyUsage(),
      })
    }
    throw error
  }
  const usage = usageFromGenerateTextResult(generationResult)
  const { text } = generationResult
  const newMessages = [toolMessage, createExpertMessage(text ? [{ type: "textPart", text }] : [])]
  return completeRun(setting, checkpoint, {
    checkpoint: {
      ...checkpoint,
      messages: [...messages, ...newMessages],
      usage: sumUsage(checkpoint.usage, usage),
      contextWindowUsage: checkpoint.contextWindow
        ? calculateContextWindowUsage(usage, checkpoint.contextWindow)
        : undefined,
      status: "completed",
    },
    step: {
      ...step,
      newMessages: [...step.newMessages, ...newMessages],
      finishedAt: new Date().getTime(),
      usage: sumUsage(step.usage, usage),
    },
    text,
    usage,
  })
}
