import {
  attemptCompletion,
  callDelegate,
  callInteractiveTool,
  type RunEvent,
  resolveToolResults,
  type ToolResult,
} from "@perstack/core"
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
