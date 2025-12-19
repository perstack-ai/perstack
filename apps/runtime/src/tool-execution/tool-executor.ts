import type { SkillType, ToolCall, ToolResult } from "@perstack/core"
import type { BaseSkillManager } from "../skill-manager/base.js"

/**
 * Interface for tool executors following the Strategy pattern.
 * Each executor handles a specific type of skill (mcp, delegate, interactive).
 */
export interface ToolExecutor {
  readonly type: SkillType

  /**
   * Execute a tool call and return the result
   */
  execute(toolCall: ToolCall, skillManagers: Record<string, BaseSkillManager>): Promise<ToolResult>
}
