import { type RunEvent, stopRunByDelegate } from "@perstack/core"
import type { RunSnapshot } from "../runtime-state-machine.js"
import { getSkillManagerByToolName } from "../skill-manager/index.js"

export async function callingDelegateLogic({
  setting,
  checkpoint,
  step,
  skillManagers,
}: RunSnapshot["context"]): Promise<RunEvent> {
  if (!step.pendingToolCalls || step.pendingToolCalls.length === 0) {
    throw new Error("No pending tool calls found")
  }
  const toolCall = step.pendingToolCalls[0]
  if (!toolCall) {
    throw new Error("No pending tool call found")
  }
  const { id, toolName, args } = toolCall
  const skillManager = await getSkillManagerByToolName(skillManagers, toolName)
  if (!skillManager.expert) {
    throw new Error(`Delegation error: skill manager "${toolName}" not found`)
  }
  if (!args || !args.query || typeof args.query !== "string") {
    throw new Error("Delegation error: query is undefined")
  }
  const remainingToolCalls = step.pendingToolCalls.slice(1)
  return stopRunByDelegate(setting, checkpoint, {
    checkpoint: {
      ...checkpoint,
      status: "stoppedByDelegate",
      delegateTo: {
        expert: {
          key: skillManager.expert.key,
          name: skillManager.expert.name,
          version: skillManager.expert.version,
        },
        toolCallId: id,
        toolName,
        query: args.query,
      },
      pendingToolCalls: remainingToolCalls.length > 0 ? remainingToolCalls : undefined,
      partialToolResults: step.partialToolResults,
    },
    step: {
      ...step,
      finishedAt: Date.now(),
    },
  })
}
