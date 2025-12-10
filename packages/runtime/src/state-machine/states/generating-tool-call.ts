import { createId } from "@paralleldrive/cuid2"
import {
  callTools,
  type RunEvent,
  retry,
  type TextPart,
  type ToolCall,
  type ToolCallPart,
} from "@perstack/core"
import { type GenerateTextResult, generateText, type ToolSet } from "ai"
import { getModel } from "../../helpers/model.js"
import { createEmptyUsage, usageFromGenerateTextResult } from "../../helpers/usage.js"
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
  skillManagers,
}: RunSnapshot["context"]): Promise<RunEvent> {
  const { messages } = checkpoint
  const model = getModel(setting.model, setting.providerConfig)
  let result: GenerateTextResult<ToolSet, never>
  try {
    result = await generateText({
      model,
      messages: messages.map(messageToCoreMessage),
      temperature: setting.temperature,
      maxRetries: setting.maxRetries,
      tools: await getToolSet(skillManagers),
      toolChoice: "required",
      abortSignal: AbortSignal.timeout(setting.timeout),
    })
  } catch (error) {
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
  const { text, toolCalls, finishReason } = result
  if (toolCalls.length === 0) {
    const reason = JSON.stringify({
      error: "Error: No tool call generated",
      message: "You must generate a tool call. Try again.",
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
    const contents: Array<Omit<TextPart, "id"> | Omit<ToolCallPart, "id">> = [...toolCallParts]
    if (text) {
      contents.push({ type: "textPart", text })
    }
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
