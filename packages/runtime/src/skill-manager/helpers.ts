import type { Expert, RunEvent, RunSetting, RuntimeEvent, ToolDefinition } from "@perstack/core"
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
  const { perstackBaseSkillCommand, env, runId } = setting
  const { skills } = expert
  if (!skills["@perstack/base"]) {
    throw new Error("Base skill is not defined")
  }
  const allManagers: BaseSkillManager[] = []
  const mcpSkills = Object.values(skills).filter(
    (skill) => skill.type === "mcpStdioSkill" || skill.type === "mcpSseSkill",
  )
  for (const skill of mcpSkills) {
    if (perstackBaseSkillCommand && skill.type === "mcpStdioSkill") {
      const matchesBaseByPackage = skill.command === "npx" && skill.packageName === "@perstack/base"
      const matchesBaseByArgs =
        skill.command === "npx" &&
        Array.isArray(skill.args) &&
        skill.args.includes("@perstack/base")
      if (matchesBaseByPackage || matchesBaseByArgs) {
        const [overrideCommand, ...overrideArgs] = perstackBaseSkillCommand
        if (!overrideCommand) {
          throw new Error("perstackBaseSkillCommand must have at least one element")
        }
        skill.command = overrideCommand
        skill.packageName = undefined
        skill.args = overrideArgs
        skill.lazyInit = false
      }
    }
  }
  const mcpSkillManagers = mcpSkills.map((skill) => {
    const manager = new McpSkillManager(skill, env, runId, eventListener)
    allManagers.push(manager)
    return manager
  })
  await initSkillManagersWithCleanup(mcpSkillManagers, allManagers)
  const interactiveSkills = Object.values(skills).filter(
    (skill) => skill.type === "interactiveSkill",
  )
  const interactiveSkillManagers = interactiveSkills.map((interactiveSkill) => {
    const manager = new InteractiveSkillManager(interactiveSkill, runId, eventListener)
    allManagers.push(manager)
    return manager
  })
  await initSkillManagersWithCleanup(interactiveSkillManagers, allManagers)
  const delegateSkillManagers = expert.delegates.map((delegateExpertName) => {
    const delegate = experts[delegateExpertName]
    const manager = new DelegateSkillManager(delegate, runId, eventListener)
    allManagers.push(manager)
    return manager
  })
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
  for (const skillManager of Object.values(skillManagers)) {
    await skillManager.close()
  }
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

