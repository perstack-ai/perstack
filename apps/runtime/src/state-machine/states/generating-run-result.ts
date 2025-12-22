import {
  completeRun,
  createRuntimeEvent,
  type RunEvent,
  retry,
  stopRunByError,
  type TextPart,
  type ThinkingPart,
} from "@perstack/core"
import { APICallError, type GenerateTextResult, generateText, type ToolSet } from "ai"
import {
  calculateContextWindowUsage,
  getModel,
  getReasoningProviderOptions,
} from "../../helpers/model.js"
import {
  extractThinkingParts,
  extractThinkingText,
  type ReasoningPart,
} from "../../helpers/thinking.js"
import { createEmptyUsage, sumUsage, usageFromGenerateTextResult } from "../../helpers/usage.js"
import {
  createExpertMessage,
  createToolMessage,
  createUserMessage,
  messageToCoreMessage,
} from "../../messages/message.js"
import type { RunSnapshot } from "../machine.js"

export async function generatingRunResultLogic({
  setting,
  checkpoint,
  step,
  eventListener,
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
  const toolMessage = createToolMessage(toolResultParts)
  const model = getModel(setting.model, setting.providerConfig, { proxyUrl: setting.proxyUrl })
  // Extended Thinking must be enabled for all requests in a conversation once enabled
  const providerOptions = getReasoningProviderOptions(
    setting.providerConfig.providerName,
    setting.reasoningBudget,
  )
  const { messages } = checkpoint
  let generationResult: GenerateTextResult<ToolSet, never>
  const coreMessages = [...messages, toolMessage].map(messageToCoreMessage)
  try {
    generationResult = await generateText({
      model,
      messages: coreMessages,
      maxRetries: setting.maxRetries,
      abortSignal: AbortSignal.timeout(setting.timeout),
      providerOptions,
    })
  } catch (error) {
    if (error instanceof APICallError && !error.isRetryable) {
      return stopRunByError(setting, checkpoint, {
        checkpoint: {
          ...checkpoint,
          status: "stoppedByError",
        },
        step: {
          ...step,
          finishedAt: Date.now(),
        },
        error: {
          name: error.name,
          message: error.message,
          statusCode: error.statusCode,
          isRetryable: false,
        },
      })
    }
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
  const { text, reasoning } = generationResult

  // Extract thinking from reasoning (Anthropic, Google)
  const thinkingParts = extractThinkingParts(reasoning as ReasoningPart[] | undefined)
  const thinkingText = extractThinkingText(reasoning as ReasoningPart[] | undefined)

  // Build ExpertMessage with ThinkingPart + TextPart
  const expertContents: Array<Omit<ThinkingPart, "id"> | Omit<TextPart, "id">> = [
    ...thinkingParts,
    ...(text ? [{ type: "textPart" as const, text }] : []),
  ]
  const newMessages = [toolMessage, createExpertMessage(expertContents)]

  // Emit completeReasoning event if reasoning text exists
  if (thinkingText) {
    await eventListener(
      createRuntimeEvent("completeReasoning", setting.jobId, setting.runId, {
        text: thinkingText,
      }),
    )
  }

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
      finishedAt: Date.now(),
      usage: sumUsage(step.usage, usage),
    },
    text,
    usage,
  })
}
