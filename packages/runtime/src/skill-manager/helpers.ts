import type { Expert, InteractiveSkill, McpSseSkill, McpStdioSkill, RunEvent, RunSetting, RuntimeEvent } from "@perstack/core"
import { jsonSchema, type ToolSet, tool } from "ai"
import type { BaseSkillManager } from "./base.js"
import {
  type SkillManagerFactory,
  type SkillManagerFactoryContext,
  defaultSkillManagerFactory,
} from "./skill-manager-factory.js"

/**
 * Initialize skill managers and cleanup on failure.
 * Exported for testing purposes.
 */
export async function initSkillManagersWithCleanup(
  managers: BaseSkillManager[],
  allManagers: BaseSkillManager[],
): Promise<void> {
  const results = await Promise.allSettled(managers.map((m) => m.init()))
  const firstRejected = results.find((r) => r.status === "rejected")
  if (firstRejected) {
    await Promise.all(allManagers.map((m) => m.close().catch(() => {})))
    throw (firstRejected as PromiseRejectedResult).reason
  }
}

export interface GetSkillManagersOptions {
  isDelegatedRun?: boolean
  factory?: SkillManagerFactory
}

export async function getSkillManagers(
  expert: Expert,
  experts: Record<string, Expert>,
  setting: RunSetting,
  eventListener?: (event: RunEvent | RuntimeEvent) => void,
  options?: GetSkillManagersOptions,
): Promise<Record<string, BaseSkillManager>> {
  const { perstackBaseSkillCommand, env, jobId, runId } = setting
  const { skills } = expert
  const factory = options?.factory ?? defaultSkillManagerFactory

  if (!skills["@perstack/base"]) {
    throw new Error("Base skill is not defined")
  }

  const factoryContext: SkillManagerFactoryContext = {
    env,
    jobId,
    runId,
    eventListener,
  }

  const allManagers: BaseSkillManager[] = []

  // Process MCP skills
  const mcpSkills = Object.values(skills)
    .filter((skill): skill is McpStdioSkill | McpSseSkill =>
      skill.type === "mcpStdioSkill" || skill.type === "mcpSseSkill"
    )
    .map((skill) => {
      if (perstackBaseSkillCommand && skill.type === "mcpStdioSkill") {
        const matchesBaseByPackage =
          skill.command === "npx" && skill.packageName === "@perstack/base"
        const matchesBaseByArgs =
          skill.command === "npx" &&
          Array.isArray(skill.args) &&
          skill.args.includes("@perstack/base")
        if (matchesBaseByPackage || matchesBaseByArgs) {
          const [overrideCommand, ...overrideArgs] = perstackBaseSkillCommand
          if (!overrideCommand) {
            throw new Error("perstackBaseSkillCommand must have at least one element")
          }
          return {
            ...skill,
            command: overrideCommand,
            packageName: undefined,
            args: overrideArgs,
            lazyInit: false,
          } as McpStdioSkill
        }
      }
      return skill
    })

  const mcpSkillManagers = mcpSkills.map((skill) => {
    const manager = factory.createMcp(skill, factoryContext)
    allManagers.push(manager)
    return manager
  })
  await initSkillManagersWithCleanup(mcpSkillManagers, allManagers)

  // Process interactive skills (not for delegated runs)
  if (!options?.isDelegatedRun) {
    const interactiveSkills = Object.values(skills).filter(
      (skill): skill is InteractiveSkill => skill.type === "interactiveSkill",
    )
    const interactiveSkillManagers = interactiveSkills.map((interactiveSkill) => {
      const manager = factory.createInteractive(interactiveSkill, factoryContext)
      allManagers.push(manager)
      return manager
    })
    await initSkillManagersWithCleanup(interactiveSkillManagers, allManagers)
  }

  // Process delegate experts
  const delegateSkillManagers: BaseSkillManager[] = []
  for (const delegateExpertName of expert.delegates) {
    const delegate = experts[delegateExpertName]
    if (!delegate) {
      await Promise.all(allManagers.map((m) => m.close().catch(() => {})))
      throw new Error(`Delegate expert "${delegateExpertName}" not found in experts`)
    }
    const manager = factory.createDelegate(delegate, factoryContext)
    allManagers.push(manager)
    delegateSkillManagers.push(manager)
  }
  await initSkillManagersWithCleanup(delegateSkillManagers, allManagers)

  const skillManagers: Record<string, BaseSkillManager> = {}
  for (const manager of allManagers) {
    skillManagers[manager.name] = manager
  }
  return skillManagers
}

export async function closeSkillManagers(
  skillManagers: Record<string, BaseSkillManager>,
): Promise<void> {
  await Promise.all(Object.values(skillManagers).map((m) => m.close().catch(() => {})))
}

export async function getSkillManagerByToolName(
  skillManagers: Record<string, BaseSkillManager>,
  toolName: string,
): Promise<BaseSkillManager> {
  for (const skillManager of Object.values(skillManagers)) {
    const toolDefinitions = await skillManager.getToolDefinitions()
    for (const toolDefinition of toolDefinitions) {
      if (toolDefinition.name === toolName) {
        return skillManager
      }
    }
  }
  throw new Error(`Tool ${toolName} not found`)
}

export async function getToolSet(
  skillManagers: Record<string, BaseSkillManager>,
): Promise<ToolSet> {
  const tools: ToolSet = {}
  for (const skillManager of Object.values(skillManagers)) {
    const toolDefinitions = await skillManager.getToolDefinitions()
    for (const toolDefinition of toolDefinitions) {
      tools[toolDefinition.name] = tool({
        description: toolDefinition.description,
        inputSchema: jsonSchema(toolDefinition.inputSchema),
      })
    }
  }
  return tools
}
