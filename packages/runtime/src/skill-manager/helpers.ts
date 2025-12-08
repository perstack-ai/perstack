import type { Expert, RunEvent, RunSetting, RuntimeEvent } from "@perstack/core"
import { jsonSchema, type ToolSet, tool } from "ai"
import type { BaseSkillManager } from "./base.js"
import { DelegateSkillManager } from "./delegate.js"
import { InteractiveSkillManager } from "./interactive.js"
import { McpSkillManager } from "./mcp.js"

async function initSkillManagersWithCleanup(
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

export async function getSkillManagers(
  expert: Expert,
  experts: Record<string, Expert>,
  setting: RunSetting,
  eventListener?: (event: RunEvent | RuntimeEvent) => void,
): Promise<Record<string, BaseSkillManager>> {
  const { perstackBaseSkillCommand, env, jobId, runId } = setting
  const { skills } = expert
  if (!skills["@perstack/base"]) {
    throw new Error("Base skill is not defined")
  }
  const allManagers: BaseSkillManager[] = []
  const mcpSkills = Object.values(skills)
    .filter((skill) => skill.type === "mcpStdioSkill" || skill.type === "mcpSseSkill")
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
          }
        }
      }
      return skill
    })
  const mcpSkillManagers = mcpSkills.map((skill) => {
    const manager = new McpSkillManager(skill, env, jobId, runId, eventListener)
    allManagers.push(manager)
    return manager
  })
  await initSkillManagersWithCleanup(mcpSkillManagers, allManagers)
  const interactiveSkills = Object.values(skills).filter(
    (skill) => skill.type === "interactiveSkill",
  )
  const interactiveSkillManagers = interactiveSkills.map((interactiveSkill) => {
    const manager = new InteractiveSkillManager(interactiveSkill, jobId, runId, eventListener)
    allManagers.push(manager)
    return manager
  })
  await initSkillManagersWithCleanup(interactiveSkillManagers, allManagers)
  const delegateSkillManagers: DelegateSkillManager[] = []
  for (const delegateExpertName of expert.delegates) {
    const delegate = experts[delegateExpertName]
    if (!delegate) {
      await Promise.all(allManagers.map((m) => m.close().catch(() => {})))
      throw new Error(`Delegate expert "${delegateExpertName}" not found in experts`)
    }
    const manager = new DelegateSkillManager(delegate, jobId, runId, eventListener)
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
