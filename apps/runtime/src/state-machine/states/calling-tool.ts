import {
  attemptCompletion,
  callDelegate,
  callInteractiveTool,
  completeRun,
  type RunEvent,
  resolveToolResults,
  type ToolResult,
} from "@perstack/core"
import { calculateContextWindowUsage } from "../../helpers/model.js"
import { createEmptyUsage, sumUsage } from "../../helpers/usage.js"
import { createToolMessage } from "../../messages/message.js"
import { classifyToolCalls, toolExecutorFactory } from "../../tool-execution/index.js"
import type { RunSnapshot } from "../machine.js"

function hasRemainingTodos(toolResult: ToolResult): boolean {
  const firstPart = toolResult.result[0]
  if (!firstPart || firstPart.type !== "textPart") {
    return false
  }
  try {
    const parsed = JSON.parse(firstPart.text)
    return Array.isArray(parsed.remainingTodos) && parsed.remainingTodos.length > 0
  } catch {
    return false
  }
}

/**
 * Extract textPart from the last expert message.
 * When LLM generates both text and attemptCompletion in one response,
 * we should use that text as the final result instead of re-generating.
 */
function extractTextFromLastMessage(checkpoint: RunSnapshot["context"]["checkpoint"]): string | undefined {
  const lastMessage = checkpoint.messages[checkpoint.messages.length - 1]
  if (!lastMessage || lastMessage.type !== "expertMessage") {
    return undefined
  }
  const textPart = lastMessage.contents.find((c) => c.type === "textPart")
  if (!textPart || textPart.type !== "textPart") {
    return undefined
  }
  // Only return if there's actual content (not just whitespace)
  const text = textPart.text.trim()
  return text.length > 0 ? text : undefined
}

export async function callingToolLogic({
  setting,
  checkpoint,
  step,
  skillManagers,
}: RunSnapshot["context"]): Promise<RunEvent> {
  const pendingToolCalls = step.pendingToolCalls ?? step.toolCalls ?? []
  if (pendingToolCalls.length === 0) {
    throw new Error("No tool calls found")
  }

  const toolResults: ToolResult[] = step.toolResults ? [...step.toolResults] : []

  // Handle attemptCompletion specially
  const attemptCompletionTool = pendingToolCalls.find(
    (tc) => tc.skillName === "@perstack/base" && tc.toolName === "attemptCompletion",
  )
  if (attemptCompletionTool) {
    const toolResult = await toolExecutorFactory.execute(
      attemptCompletionTool,
      "mcp",
      skillManagers,
    )
    if (hasRemainingTodos(toolResult)) {
      return resolveToolResults(setting, checkpoint, { toolResults: [toolResult] })
    }

    // Check if LLM already generated a text response along with attemptCompletion
    // If so, use that text directly instead of transitioning to GeneratingRunResult
    const existingText = extractTextFromLastMessage(checkpoint)
    if (existingText) {
      // Build tool message for the attemptCompletion result
      const toolResultPart = {
        type: "toolResultPart" as const,
        toolCallId: toolResult.id,
        toolName: attemptCompletionTool.toolName,
        contents: toolResult.result.filter(
          (part) =>
            part.type === "textPart" ||
            part.type === "imageInlinePart" ||
            part.type === "fileInlinePart",
        ),
      }
      const toolMessage = createToolMessage([toolResultPart])
      const newUsage = sumUsage(checkpoint.usage, createEmptyUsage())

      // Complete run directly with the existing text
      return completeRun(setting, checkpoint, {
        checkpoint: {
          ...checkpoint,
          messages: [...checkpoint.messages, toolMessage],
          usage: newUsage,
          contextWindowUsage: checkpoint.contextWindow
            ? calculateContextWindowUsage(newUsage, checkpoint.contextWindow)
            : undefined,
          status: "completed",
        },
        step: {
          ...step,
          newMessages: [...step.newMessages, toolMessage],
          toolResults: [toolResult],
          finishedAt: Date.now(),
        },
        text: existingText,
        usage: createEmptyUsage(),
      })
    }

    // No existing text - transition to GeneratingRunResult to generate final result
    return attemptCompletion(setting, checkpoint, { toolResult })
  }

  // Classify tool calls by type
  const classified = await classifyToolCalls(pendingToolCalls, skillManagers)

  // Execute MCP tools
  if (classified.mcp.length > 0) {
    const mcpResults = await Promise.all(
      classified.mcp.map((c) => toolExecutorFactory.execute(c.toolCall, "mcp", skillManagers)),
    )
    toolResults.push(...mcpResults)
  }

  // Handle delegate tools
  if (classified.delegate.length > 0) {
    const delegateToolCalls = classified.delegate.map((c) => c.toolCall)
    const interactiveToolCalls = classified.interactive.map((c) => c.toolCall)
    step.partialToolResults = toolResults
    step.pendingToolCalls = [...delegateToolCalls, ...interactiveToolCalls]
    return callDelegate(setting, checkpoint, {
      newMessage: checkpoint.messages[checkpoint.messages.length - 1] as never,
      toolCalls: delegateToolCalls,
      usage: step.usage,
    })
  }

  // Handle interactive tools
  if (classified.interactive.length > 0) {
    const interactiveToolCall = classified.interactive[0]?.toolCall
    if (!interactiveToolCall) {
      throw new Error("No interactive tool call found")
    }
    const interactiveToolCalls = classified.interactive.map((c) => c.toolCall)
    step.partialToolResults = toolResults
    step.pendingToolCalls = interactiveToolCalls
    return callInteractiveTool(setting, checkpoint, {
      newMessage: checkpoint.messages[checkpoint.messages.length - 1] as never,
      toolCall: interactiveToolCall,
      usage: step.usage,
    })
  }

  return resolveToolResults(setting, checkpoint, { toolResults })
}
