import type { SkillType, ToolCall, ToolResult } from "@perstack/core"
import type { BaseSkillManager } from "../skill-manager/base.js"
import { McpToolExecutor } from "./mcp-executor.js"
import type { ToolExecutor } from "./tool-executor.js"

/**
 * Factory for creating tool executors based on skill type.
 * Follows the Factory pattern from packages/docker.
 */
export class ToolExecutorFactory {
  private executors: Map<SkillType, ToolExecutor>

  constructor() {
    this.executors = new Map([
      ["mcp", new McpToolExecutor()],
      // delegate and interactive are handled specially (not executed here)
    ])
  }

  /**
   * Get the executor for a given skill type
   */
  getExecutor(type: SkillType): ToolExecutor | undefined {
    return this.executors.get(type)
  }

  /**
   * Execute a tool call using the appropriate executor
   */
  async execute(
    toolCall: ToolCall,
    type: SkillType,
    skillManagers: Record<string, BaseSkillManager>,
  ): Promise<ToolResult> {
    const executor = this.executors.get(type)
    if (!executor) {
      throw new Error(`No executor registered for skill type: ${type}`)
    }
    return executor.execute(toolCall, skillManagers)
  }

  /**
   * Check if a skill type can be executed locally (vs requiring delegation)
   */
  canExecuteLocally(type: SkillType): boolean {
    return type === "mcp"
  }
}

/**
 * Singleton factory instance for convenience
 */
export const toolExecutorFactory = new ToolExecutorFactory()
