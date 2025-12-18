import type { Expert, InteractiveSkill, McpSseSkill, McpStdioSkill, RunEvent, RuntimeEvent } from "@perstack/core"
import type { BaseSkillManager } from "./base.js"
import { DelegateSkillManager } from "./delegate.js"
import { InteractiveSkillManager } from "./interactive.js"
import { McpSkillManager, type McpSkillManagerOptions } from "./mcp.js"

export interface SkillManagerFactoryContext {
  env: Record<string, string>
  jobId: string
  runId: string
  eventListener?: (event: RunEvent | RuntimeEvent) => void
  mcpOptions?: McpSkillManagerOptions
}

/**
 * Factory interface for creating skill managers.
 * Allows for dependency injection and easier testing.
 */
export interface SkillManagerFactory {
  createMcp(skill: McpStdioSkill | McpSseSkill, context: SkillManagerFactoryContext): BaseSkillManager
  createInteractive(skill: InteractiveSkill, context: SkillManagerFactoryContext): BaseSkillManager
  createDelegate(expert: Expert, context: SkillManagerFactoryContext): BaseSkillManager
}

/**
 * Default implementation of SkillManagerFactory using real skill manager classes.
 */
export class DefaultSkillManagerFactory implements SkillManagerFactory {
  createMcp(skill: McpStdioSkill | McpSseSkill, context: SkillManagerFactoryContext): BaseSkillManager {
    return new McpSkillManager(
      skill,
      context.env,
      context.jobId,
      context.runId,
      context.eventListener,
      context.mcpOptions,
    )
  }

  createInteractive(skill: InteractiveSkill, context: SkillManagerFactoryContext): BaseSkillManager {
    return new InteractiveSkillManager(skill, context.jobId, context.runId, context.eventListener)
  }

  createDelegate(expert: Expert, context: SkillManagerFactoryContext): BaseSkillManager {
    return new DelegateSkillManager(expert, context.jobId, context.runId, context.eventListener)
  }
}

/**
 * Default skill manager factory instance.
 */
export const defaultSkillManagerFactory = new DefaultSkillManagerFactory()
