import {
  attemptCompletion,
  type RunEvent,
  resolveImageFile,
  resolvePdfFile,
  resolveThought,
  resolveToolResult,
  type ToolResult,
} from "@perstack/core"
import type { RunSnapshot } from "../runtime-state-machine.js"
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

export async function callingToolLogic({
  setting,
  checkpoint,
  step,
  skillManagers,
}: RunSnapshot["context"]): Promise<RunEvent> {
  if (!step.toolCall) {
    throw new Error("No tool call found")
  }
  const { id, skillName, toolName, args } = step.toolCall
  const skillManager = await getSkillManagerByToolName(skillManagers, toolName)
  if (skillManager.type !== "mcp") {
    throw new Error(`Incorrect SkillType, required MCP, got ${skillManager.type}`)
  }
  const result = await skillManager.callTool(toolName, args)
  const toolResult: ToolResult = { id, skillName, toolName, result }
  if (skillName === "@perstack/base") {
    if (toolName === "think") {
      return resolveThought(setting, checkpoint, { toolResult })
    }
    if (toolName === "attemptCompletion") {
      if (hasRemainingTodos(toolResult)) {
        return resolveToolResult(setting, checkpoint, { toolResult })
      }
      return attemptCompletion(setting, checkpoint, { toolResult })
    }
    if (toolName === "readPdfFile") {
      return resolvePdfFile(setting, checkpoint, { toolResult })
    }
    if (toolName === "readImageFile") {
      return resolveImageFile(setting, checkpoint, { toolResult })
    }
  }
  return resolveToolResult(setting, checkpoint, { toolResult })
}
