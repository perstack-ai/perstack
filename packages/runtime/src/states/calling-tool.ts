import {
  type RunEvent,
  type ToolResult,
  attemptCompletion,
  resolveImageFile,
  resolvePdfFile,
  resolveThought,
  resolveToolResult,
} from "@perstack/core"
import type { RunSnapshot } from "../runtime-state-machine.js"
import { getSkillManagerByToolName } from "../skill-manager.js"

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
