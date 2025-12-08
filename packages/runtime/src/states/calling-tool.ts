import {
  attemptCompletion,
  callDelegate,
  callInteractiveTool,
  type RunEvent,
  resolveImageFile,
  resolvePdfFile,
  resolveThought,
  resolveToolResults,
  type ToolCall,
  type ToolResult,
} from "@perstack/core"
import type { RunSnapshot } from "../runtime-state-machine.js"
import type { BaseSkillManager } from "../skill-manager/index.js"
import type { McpSkillManager } from "../skill-manager/mcp.js"
import { getSkillManagerByToolName } from "../skill-manager/index.js"

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

async function executeMcpToolCall(
  toolCall: ToolCall,
  skillManagers: Record<string, BaseSkillManager>,
): Promise<ToolResult> {
  const skillManager = await getSkillManagerByToolName(skillManagers, toolCall.toolName)
  if (skillManager.type !== "mcp") {
    throw new Error(`Incorrect SkillType, required MCP, got ${skillManager.type}`)
  }
  const result = await (skillManager as McpSkillManager).callTool(toolCall.toolName, toolCall.args)
  return {
    id: toolCall.id,
    skillName: toolCall.skillName,
    toolName: toolCall.toolName,
    result,
  }
}

async function getToolType(
  toolCall: ToolCall,
  skillManagers: Record<string, BaseSkillManager>,
): Promise<"mcp" | "delegate" | "interactive"> {
  const skillManager = await getSkillManagerByToolName(skillManagers, toolCall.toolName)
  return skillManager.type
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
  const thinkTool = pendingToolCalls.find(
    (tc) => tc.skillName === "@perstack/base" && tc.toolName === "think",
  )
  if (thinkTool) {
    const toolResult = await executeMcpToolCall(thinkTool, skillManagers)
    return resolveThought(setting, checkpoint, { toolResult })
  }
  const attemptCompletionTool = pendingToolCalls.find(
    (tc) => tc.skillName === "@perstack/base" && tc.toolName === "attemptCompletion",
  )
  if (attemptCompletionTool) {
    const toolResult = await executeMcpToolCall(attemptCompletionTool, skillManagers)
      if (hasRemainingTodos(toolResult)) {
      return resolveToolResults(setting, checkpoint, { toolResults: [toolResult] })
      }
      return attemptCompletion(setting, checkpoint, { toolResult })
    }
  const readPdfFileTool = pendingToolCalls.find(
    (tc) => tc.skillName === "@perstack/base" && tc.toolName === "readPdfFile",
  )
  if (readPdfFileTool) {
    const toolResult = await executeMcpToolCall(readPdfFileTool, skillManagers)
      return resolvePdfFile(setting, checkpoint, { toolResult })
    }
  const readImageFileTool = pendingToolCalls.find(
    (tc) => tc.skillName === "@perstack/base" && tc.toolName === "readImageFile",
  )
  if (readImageFileTool) {
    const toolResult = await executeMcpToolCall(readImageFileTool, skillManagers)
      return resolveImageFile(setting, checkpoint, { toolResult })
    }
  const toolCallTypes = await Promise.all(
    pendingToolCalls.map(async (tc) => ({
      toolCall: tc,
      type: await getToolType(tc, skillManagers),
    })),
  )
  const mcpToolCalls = toolCallTypes.filter((t) => t.type === "mcp").map((t) => t.toolCall)
  const delegateToolCalls = toolCallTypes.filter((t) => t.type === "delegate").map((t) => t.toolCall)
  const interactiveToolCalls = toolCallTypes
    .filter((t) => t.type === "interactive")
    .map((t) => t.toolCall)
  if (mcpToolCalls.length > 0) {
    const mcpResults = await Promise.all(
      mcpToolCalls.map((tc) => executeMcpToolCall(tc, skillManagers)),
    )
    toolResults.push(...mcpResults)
  }
  const remainingToolCalls = [...delegateToolCalls, ...interactiveToolCalls]
  if (delegateToolCalls.length > 0) {
    const delegateToolCall = delegateToolCalls[0]
    if (!delegateToolCall) {
      throw new Error("No delegate tool call found")
    }
    step.partialToolResults = toolResults
    step.pendingToolCalls = remainingToolCalls
    return callDelegate(setting, checkpoint, {
      newMessage: checkpoint.messages[checkpoint.messages.length - 1] as never,
      toolCall: delegateToolCall,
      usage: step.usage,
    })
  }
  if (interactiveToolCalls.length > 0) {
    const interactiveToolCall = interactiveToolCalls[0]
    if (!interactiveToolCall) {
      throw new Error("No interactive tool call found")
    }
    step.partialToolResults = toolResults
    step.pendingToolCalls = remainingToolCalls
    return callInteractiveTool(setting, checkpoint, {
      newMessage: checkpoint.messages[checkpoint.messages.length - 1] as never,
      toolCall: interactiveToolCall,
      usage: step.usage,
    })
  }
  return resolveToolResults(setting, checkpoint, { toolResults })
}
