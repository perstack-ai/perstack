import type { SkillType, ToolCall } from "@perstack/core"
import type { BaseSkillManager } from "../skill-manager/base.js"
import { getSkillManagerByToolName } from "../skill-manager/helpers.js"

export type ClassifiedToolCall = {
  toolCall: ToolCall
  type: SkillType
  skillManager: BaseSkillManager
}

export type ClassifiedToolCalls = {
  mcp: ClassifiedToolCall[]
  delegate: ClassifiedToolCall[]
  interactive: ClassifiedToolCall[]
}

/**
 * Get the skill type for a single tool call
 */
export async function getToolType(
  toolCall: ToolCall,
  skillManagers: Record<string, BaseSkillManager>,
): Promise<SkillType> {
  const skillManager = await getSkillManagerByToolName(skillManagers, toolCall.toolName)
  return skillManager.type
}

/**
 * Get the skill type for a tool by name only
 */
export async function getToolTypeByName(
  toolName: string,
  skillManagers: Record<string, BaseSkillManager>,
): Promise<SkillType> {
  const skillManager = await getSkillManagerByToolName(skillManagers, toolName)
  return skillManager.type
}

/**
 * Classify multiple tool calls by their skill type
 */
export async function classifyToolCalls(
  toolCalls: ToolCall[],
  skillManagers: Record<string, BaseSkillManager>,
): Promise<ClassifiedToolCalls> {
  const classified: ClassifiedToolCalls = {
    mcp: [],
    delegate: [],
    interactive: [],
  }

  const results = await Promise.all(
    toolCalls.map(async (toolCall) => {
      const skillManager = await getSkillManagerByToolName(skillManagers, toolCall.toolName)
      return { toolCall, type: skillManager.type, skillManager }
    }),
  )

  for (const result of results) {
    classified[result.type].push(result)
  }

  return classified
}

/**
 * Sort tool calls by execution priority: mcp -> delegate -> interactive
 */
export function sortByPriority(classified: ClassifiedToolCalls): ClassifiedToolCall[] {
  return [...classified.mcp, ...classified.delegate, ...classified.interactive]
}
