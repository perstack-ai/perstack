import {
  type DelegationTarget,
  type RunEvent,
  type RuntimeName,
  stopRunByDelegate,
} from "@perstack/core"
import type { RunSnapshot } from "../runtime-state-machine.js"
import type { BaseSkillManager } from "../skill-manager/index.js"
import { getSkillManagerByToolName } from "../skill-manager/index.js"

async function getToolType(
  toolName: string,
  skillManagers: Record<string, BaseSkillManager>,
): Promise<"mcp" | "delegate" | "interactive"> {
  const skillManager = await getSkillManagerByToolName(skillManagers, toolName)
  return skillManager.type
}

export async function callingDelegateLogic({
  setting,
  checkpoint,
  step,
  skillManagers,
}: RunSnapshot["context"]): Promise<RunEvent> {
  if (!step.pendingToolCalls || step.pendingToolCalls.length === 0) {
    throw new Error("No pending tool calls found")
  }
  const toolCallTypes = await Promise.all(
    step.pendingToolCalls.map(async (tc) => ({
      toolCall: tc,
      type: await getToolType(tc.toolName, skillManagers),
    })),
  )
  const delegateToolCalls = toolCallTypes
    .filter((t) => t.type === "delegate")
    .map((t) => t.toolCall)
  const nonDelegateToolCalls = toolCallTypes
    .filter((t) => t.type !== "delegate")
    .map((t) => t.toolCall)
  if (delegateToolCalls.length === 0) {
    throw new Error("No delegate tool calls found")
  }
  const delegations: DelegationTarget[] = await Promise.all(
    delegateToolCalls.map(async (tc) => {
      const skillManager = await getSkillManagerByToolName(skillManagers, tc.toolName)
      if (!skillManager.expert) {
        throw new Error(`Delegation error: skill manager "${tc.toolName}" not found`)
      }
      if (!tc.args || !tc.args.query || typeof tc.args.query !== "string") {
        throw new Error(`Delegation error: query is undefined for ${tc.toolName}`)
      }
      const runtime = tc.args.runtime as RuntimeName | RuntimeName[] | undefined
      return {
        expert: {
          key: skillManager.expert.key,
          name: skillManager.expert.name,
          version: skillManager.expert.version,
        },
        toolCallId: tc.id,
        toolName: tc.toolName,
        query: tc.args.query,
        runtime,
      }
    }),
  )
  return stopRunByDelegate(setting, checkpoint, {
    checkpoint: {
      ...checkpoint,
      status: "stoppedByDelegate",
      delegateTo: delegations,
      pendingToolCalls: nonDelegateToolCalls.length > 0 ? nonDelegateToolCalls : undefined,
      partialToolResults: step.partialToolResults,
    },
    step: {
      ...step,
      finishedAt: Date.now(),
    },
  })
}
