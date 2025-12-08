import { createId } from "@paralleldrive/cuid2"
import {
  callDelegate,
  callInteractiveTool,
  callTools,
  type RunEvent,
  retry,
  type TextPart,
  type ToolCall,
  type ToolCallPart,
} from "@perstack/core"
import { type GenerateTextResult, generateText, type ToolSet } from "ai"
import {
  createExpertMessage,
  createToolMessage,
  createUserMessage,
  messageToCoreMessage,
} from "../messages/message.js"
import { getModel } from "../model.js"
import type { RunSnapshot } from "../runtime-state-machine.js"
import type { BaseSkillManager } from "../skill-manager/index.js"
import { getSkillManagerByToolName, getToolSet } from "../skill-manager/index.js"
import { createEmptyUsage, usageFromGenerateTextResult } from "../usage.js"

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
  const interactiveTool = classified.find((tc) => tc.skillManager.type === "interactive")
  const delegateTool = classified.find((tc) => tc.skillManager.type === "delegate")
  if (interactiveTool) {
    const contents: Array<Omit<TextPart, "id"> | Omit<ToolCallPart, "id">> = [
      {
        type: "toolCallPart",
        toolCallId: interactiveTool.toolCallId,
        toolName: interactiveTool.toolName,
        args: interactiveTool.input,
      },
    ]
    if (text) {
      contents.push({ type: "textPart", text })
    }
    return callInteractiveTool(setting, checkpoint, {
      newMessage: createExpertMessage(contents),
      toolCall: {
        id: interactiveTool.toolCallId,
        skillName: interactiveTool.skillManager.name,
        toolName: interactiveTool.toolName,
        args: interactiveTool.input,
      },
      usage,
    })
  }
  if (delegateTool) {
    const contents: Array<Omit<TextPart, "id"> | Omit<ToolCallPart, "id">> = [
      {
        type: "toolCallPart",
        toolCallId: delegateTool.toolCallId,
        toolName: delegateTool.toolName,
        args: delegateTool.input,
      },
    ]
    if (text) {
      contents.push({ type: "textPart", text })
    }
    return callDelegate(setting, checkpoint, {
      newMessage: createExpertMessage(contents),
      toolCall: {
        id: delegateTool.toolCallId,
        skillName: delegateTool.skillManager.name,
        toolName: delegateTool.toolName,
        args: delegateTool.input,
      },
      usage,
    })
  }
  const mcpToolCalls = classified.filter((tc) => tc.skillManager.type === "mcp")
  if (finishReason === "tool-calls" || finishReason === "stop") {
    const toolCallParts = buildToolCallParts(mcpToolCalls)
    const contents: Array<Omit<TextPart, "id"> | Omit<ToolCallPart, "id">> = [...toolCallParts]
    if (text) {
      contents.push({ type: "textPart", text })
    }
    return callTools(setting, checkpoint, {
      newMessage: createExpertMessage(contents),
      toolCalls: buildToolCalls(mcpToolCalls),
      usage,
    })
  }
  if (finishReason === "length") {
    const firstToolCall = mcpToolCalls[0]
    if (!firstToolCall) {
      throw new Error("No MCP tool call found")
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
