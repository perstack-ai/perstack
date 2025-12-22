import {
  completeRun,
  createRuntimeEvent,
  type RunEvent,
  retry,
  stopRunByError,
  type TextPart,
  type ThinkingPart,
} from "@perstack/core"
import { calculateContextWindowUsage } from "../../helpers/model.js"
import {
  extractThinkingParts,
  extractThinkingText,
  type ReasoningPart,
} from "../../helpers/thinking.js"
import { createEmptyUsage, sumUsage, usageFromGenerateTextResult } from "../../helpers/usage.js"
import type { StreamCallbacks } from "../../llm/types.js"
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
  llmExecutor,
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
  const { messages } = checkpoint
  const coreMessages = [...messages, toolMessage].map(messageToCoreMessage)

  // Track if reasoning was completed via callback (to avoid duplicate emissions)
  let reasoningCompletedViaCallback = false

  // Create streaming callbacks for fire-and-forget event emission
  const callbacks: StreamCallbacks = {
    onReasoningStart: () => {
      eventListener(createRuntimeEvent("startReasoning", setting.jobId, setting.runId, {}))
    },
    onReasoningDelta: (delta) => {
      eventListener(createRuntimeEvent("streamReasoning", setting.jobId, setting.runId, { delta }))
    },
    onReasoningComplete: (text) => {
      // Emit completeReasoning before result phase starts
      eventListener(createRuntimeEvent("completeReasoning", setting.jobId, setting.runId, { text }))
      reasoningCompletedViaCallback = true
    },
    onResultStart: () => {
      eventListener(createRuntimeEvent("startRunResult", setting.jobId, setting.runId, {}))
    },
    onResultDelta: (delta) => {
      eventListener(createRuntimeEvent("streamRunResult", setting.jobId, setting.runId, { delta }))
    },
  }

  const executionResult = await llmExecutor.streamText(
    {
      messages: coreMessages,
      maxRetries: setting.maxRetries,
      tools: {}, // No tools for run result generation
      abortSignal: AbortSignal.timeout(setting.timeout),
      reasoningBudget: setting.reasoningBudget,
    },
    callbacks,
  )

  if (!executionResult.success) {
    const { error, isRetryable } = executionResult
    const currentRetryCount = checkpoint.retryCount ?? 0
    if (!isRetryable || currentRetryCount >= setting.maxRetries) {
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
          name: error.name ?? "Error",
          message:
            currentRetryCount >= setting.maxRetries
              ? `Max retries (${setting.maxRetries}) exceeded: ${error.message}`
              : error.message,
          statusCode: error.statusCode,
          isRetryable: false,
        },
      })
    }
    const reason = JSON.stringify({ error: error.name ?? "Error", message: error.message })
    return retry(setting, checkpoint, {
      reason,
      newMessages: [toolMessage, createUserMessage([{ type: "textPart", text: reason }])],
      usage: createEmptyUsage(),
    })
  }

  const generationResult = executionResult.result
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

  // Note: completeReasoning is emitted via onReasoningComplete callback during streaming
  // Fallback emission only if callback wasn't triggered (should be rare)
  if (thinkingText && !reasoningCompletedViaCallback) {
    await eventListener(
      createRuntimeEvent("completeReasoning", setting.jobId, setting.runId, {
        text: thinkingText,
      }),
    )
  }

  const newUsage = sumUsage(checkpoint.usage, usage)
  return completeRun(setting, checkpoint, {
    checkpoint: {
      ...checkpoint,
      messages: [...messages, ...newMessages],
      usage: newUsage,
      contextWindowUsage: checkpoint.contextWindow
        ? calculateContextWindowUsage(newUsage, checkpoint.contextWindow)
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
