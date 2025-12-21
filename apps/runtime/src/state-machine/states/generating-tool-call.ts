import { createId } from "@paralleldrive/cuid2"
import {
  callTools,
  completeRun,
  type RunEvent,
  retry,
  stopRunByError,
  type TextPart,
  type ThinkingPart,
  type ToolCall,
  type ToolCallPart,
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
import type { BaseSkillManager } from "../../skill-manager/index.js"
import { getSkillManagerByToolName, getToolSet } from "../../skill-manager/index.js"
import type { RunSnapshot } from "../machine.js"

type ClassifiedToolCall = {
  toolCallId: string
  toolName: string
  input: Record<string, unknown>
  skillManager: BaseSkillManager
}

async function classifyToolCalls(
  toolCalls: Array<{ toolCallId: string; toolName: string; input: unknown }>,
  skillManagers: Record<string, BaseSkillManager>,
): Promise<ClassifiedToolCall[]> {
  return Promise.all(
    toolCalls.map(async (tc) => {
      const skillManager = await getSkillManagerByToolName(skillManagers, tc.toolName)
      return {
        toolCallId: tc.toolCallId,
        toolName: tc.toolName,
        input: tc.input as Record<string, unknown>,
        skillManager,
      }
    }),
  )
}

function sortToolCallsByPriority(toolCalls: ClassifiedToolCall[]): ClassifiedToolCall[] {
  const priority = { mcp: 0, delegate: 1, interactive: 2 }
  return [...toolCalls].sort(
    (a, b) => (priority[a.skillManager.type] ?? 99) - (priority[b.skillManager.type] ?? 99),
  )
}

function buildToolCallParts(toolCalls: ClassifiedToolCall[]): Array<Omit<ToolCallPart, "id">> {
  return toolCalls.map((tc) => ({
    type: "toolCallPart" as const,
    toolCallId: tc.toolCallId,
    toolName: tc.toolName,
    args: tc.input,
  }))
}

function buildToolCalls(toolCalls: ClassifiedToolCall[]): ToolCall[] {
  return toolCalls.map((tc) => ({
    id: tc.toolCallId,
    skillName: tc.skillManager.name,
    toolName: tc.toolName,
    args: tc.input,
  }))
}

export async function generatingToolCallLogic({
  setting,
  checkpoint,
  step,
  skillManagers,
}: RunSnapshot["context"]): Promise<RunEvent> {
  const { messages } = checkpoint
  const model = getModel(setting.model, setting.providerConfig, { proxyUrl: setting.proxyUrl })
  const providerOptions = getReasoningProviderOptions(
    setting.providerConfig.providerName,
    setting.reasoningBudget,
  )
  let result: GenerateTextResult<ToolSet, never>
  try {
    result = await generateText({
      model,
      messages: messages.map(messageToCoreMessage),
      temperature: setting.temperature,
      maxRetries: setting.maxRetries,
      tools: await getToolSet(skillManagers),
      toolChoice: "auto",
      providerOptions,
      abortSignal: AbortSignal.timeout(setting.timeout),
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
        newMessages: [createUserMessage([{ type: "textPart", text: reason }])],
        usage: createEmptyUsage(),
      })
    }
    throw error
  }
  const usage = usageFromGenerateTextResult(result)
  const { text, toolCalls, finishReason, reasoning } = result
  // Extract thinking from reasoning (Anthropic, Google)
  const thinkingParts = extractThinkingParts(reasoning as ReasoningPart[] | undefined)
  const thinkingText = extractThinkingText(reasoning as ReasoningPart[] | undefined)

  // Text only = implicit completion (no tool calls)
  if (toolCalls.length === 0 && text) {
    const contents: Array<
      Omit<TextPart, "id"> | Omit<ToolCallPart, "id"> | Omit<ThinkingPart, "id">
    > = [...thinkingParts, { type: "textPart", text }]
    const newMessage = createExpertMessage(contents)
    const newUsage = sumUsage(checkpoint.usage, usage)
    return completeRun(setting, checkpoint, {
      checkpoint: {
        ...checkpoint,
        messages: [...messages, newMessage],
        usage: newUsage,
        contextWindowUsage: checkpoint.contextWindow
          ? calculateContextWindowUsage(newUsage, checkpoint.contextWindow)
          : undefined,
        status: "completed",
      },
      step: {
        ...step,
        newMessages: [...step.newMessages, newMessage],
        finishedAt: Date.now(),
        usage: sumUsage(step.usage, usage),
      },
      text,
      thinking: thinkingText || undefined,
      usage,
    })
  }

  // Nothing generated = retry
  if (toolCalls.length === 0) {
    const reason = JSON.stringify({
      error: "Error: No tool call or text generated",
      message: "You must generate a tool call or provide a response. Try again.",
    })
    return retry(setting, checkpoint, {
      reason,
      newMessages: [createUserMessage([{ type: "textPart", text: reason }])],
      usage,
    })
  }
  const classified = await classifyToolCalls(toolCalls, skillManagers)
  const sorted = sortToolCallsByPriority(classified)
  if (finishReason === "tool-calls" || finishReason === "stop") {
    const toolCallParts = buildToolCallParts(sorted)
    // Order matters for Anthropic Extended Thinking: thinking → text → tool_use
    // text must come BEFORE tool_use, not after, to avoid breaking tool_result matching
    const contents: Array<
      Omit<TextPart, "id"> | Omit<ToolCallPart, "id"> | Omit<ThinkingPart, "id">
    > = [...thinkingParts, ...(text ? [{ type: "textPart" as const, text }] : []), ...toolCallParts]
    const allToolCalls = buildToolCalls(sorted)
    return callTools(setting, checkpoint, {
      newMessage: createExpertMessage(contents),
      toolCalls: allToolCalls,
      usage,
    })
  }
  if (finishReason === "length") {
    const firstToolCall = sorted[0]
    if (!firstToolCall) {
      throw new Error("No tool call found")
    }
    const reason = JSON.stringify({
      error: "Error: Tool call generation failed",
      message: "Generation length exceeded. Try again.",
    })
    return retry(setting, checkpoint, {
      reason,
      newMessages: [
        createExpertMessage([
          {
            type: "toolCallPart",
            toolCallId: firstToolCall.toolCallId,
            toolName: firstToolCall.toolName,
            args: firstToolCall.input,
          },
        ]),
        createToolMessage([
          {
            type: "toolResultPart",
            toolCallId: firstToolCall.toolCallId,
            toolName: firstToolCall.toolName,
            contents: [{ type: "textPart", text: reason }],
          },
        ]),
      ],
      toolCalls: [
        {
          id: firstToolCall.toolCallId,
          skillName: firstToolCall.skillManager.name,
          toolName: firstToolCall.toolName,
          args: firstToolCall.input,
        },
      ],
      toolResults: [
        {
          id: firstToolCall.toolCallId,
          skillName: firstToolCall.skillManager.name,
          toolName: firstToolCall.toolName,
          result: [{ type: "textPart", id: createId(), text: reason }],
        },
      ],
      usage,
    })
  }
  throw new Error(`Unexpected finish reason: ${finishReason}`)
}
