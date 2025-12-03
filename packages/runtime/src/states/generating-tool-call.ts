import { createId } from "@paralleldrive/cuid2"
import {
  callDelegate,
  callInteractiveTool,
  callTool,
  type RunEvent,
  retry,
  type TextPart,
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
import { getSkillManagerByToolName, getToolSet } from "../skill-manager/index.js"
import { createEmptyUsage, usageFromGenerateTextResult } from "../usage.js"

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
  const toolCall = toolCalls[0]
  if (!toolCall) {
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
  const contents: Array<Omit<TextPart, "id"> | Omit<ToolCallPart, "id">> = [
    {
      type: "toolCallPart",
      toolCallId: toolCall.toolCallId,
      toolName: toolCall.toolName,
      args: toolCall.input,
    },
  ]
  if (text) {
    contents.push({
      type: "textPart",
      text,
    })
  }
  const skillManager = await getSkillManagerByToolName(skillManagers, toolCall.toolName)
  const eventPayload = {
    newMessage: createExpertMessage(contents),
    toolCall: {
      id: toolCall.toolCallId,
      skillName: skillManager.name,
      toolName: toolCall.toolName,
      args: toolCall.input,
    },
    usage,
  }
  if (finishReason === "tool-calls" || finishReason === "stop") {
    switch (skillManager.type) {
      case "mcp":
        return callTool(setting, checkpoint, eventPayload)
      case "interactive":
        return callInteractiveTool(setting, checkpoint, eventPayload)
      case "delegate":
        return callDelegate(setting, checkpoint, eventPayload)
    }
  }
  if (finishReason === "length") {
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
            toolCallId: toolCall.toolCallId,
            toolName: toolCall.toolName,
            args: toolCall.input,
          },
        ]),
        createToolMessage([
          {
            type: "toolResultPart",
            toolCallId: toolCall.toolCallId,
            toolName: toolCall.toolName,
            contents: [{ type: "textPart", text: reason }],
          },
        ]),
      ],
      toolCall: eventPayload.toolCall,
      toolResult: {
        id: toolCall.toolCallId,
        skillName: skillManager.name,
        toolName: toolCall.toolName,
        result: [{ type: "textPart", id: createId(), text: reason }],
      },
      usage,
    })
  }
  throw new Error(`Unexpected finish reason: ${finishReason}`)
}
