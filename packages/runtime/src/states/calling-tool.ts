import {
  attemptCompletion,
  type RunEvent,
  resolveImageFile,
  resolvePdfFile,
  resolveThought,
  resolveToolResults,
  type ToolCall,
  type ToolResult,
} from "@perstack/core"
import type { RunSnapshot } from "../runtime-state-machine.js"
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

async function executeToolCall(
  toolCall: ToolCall,
  skillManagers: Record<string, unknown>,
): Promise<ToolResult> {
  const skillManager = await getSkillManagerByToolName(
    skillManagers as Record<string, McpSkillManager>,
    toolCall.toolName,
  )
  if (skillManager.type !== "mcp") {
    throw new Error(`Incorrect SkillType, required MCP, got ${skillManager.type}`)
  }
  const result = await skillManager.callTool(toolCall.toolName, toolCall.args)
  return {
    id: toolCall.id,
    skillName: toolCall.skillName,
    toolName: toolCall.toolName,
    result,
  }
}

export async function callingToolLogic({
  setting,
  checkpoint,
  step,
  skillManagers,
}: RunSnapshot["context"]): Promise<RunEvent> {
  if (!step.toolCalls || step.toolCalls.length === 0) {
    throw new Error("No tool calls found")
  }
  const thinkTool = step.toolCalls.find(
    (tc) => tc.skillName === "@perstack/base" && tc.toolName === "think",
  )
  if (thinkTool) {
    const toolResult = await executeToolCall(thinkTool, skillManagers)
    return resolveThought(setting, checkpoint, { toolResult })
  }
  const attemptCompletionTool = step.toolCalls.find(
    (tc) => tc.skillName === "@perstack/base" && tc.toolName === "attemptCompletion",
  )
  if (attemptCompletionTool) {
    const toolResult = await executeToolCall(attemptCompletionTool, skillManagers)
    if (hasRemainingTodos(toolResult)) {
      return resolveToolResults(setting, checkpoint, { toolResults: [toolResult] })
    }
    return attemptCompletion(setting, checkpoint, { toolResult })
  }
  const readPdfFileTool = step.toolCalls.find(
    (tc) => tc.skillName === "@perstack/base" && tc.toolName === "readPdfFile",
  )
  if (readPdfFileTool) {
    const toolResult = await executeToolCall(readPdfFileTool, skillManagers)
    return resolvePdfFile(setting, checkpoint, { toolResult })
  }
  const readImageFileTool = step.toolCalls.find(
    (tc) => tc.skillName === "@perstack/base" && tc.toolName === "readImageFile",
  )
  if (readImageFileTool) {
    const toolResult = await executeToolCall(readImageFileTool, skillManagers)
    return resolveImageFile(setting, checkpoint, { toolResult })
  }
  const toolResults = await Promise.all(
    step.toolCalls.map((tc) => executeToolCall(tc, skillManagers)),
  )
  return resolveToolResults(setting, checkpoint, { toolResults })
}
