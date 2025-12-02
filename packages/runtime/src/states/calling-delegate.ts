import { type RunEvent, stopRunByDelegate } from "@perstack/core"
import type { RunSnapshot } from "../runtime-state-machine.js"
import { getSkillManagerByToolName } from "../skill-manager.js"

export async function callingDelegateLogic({
  setting,
  checkpoint,
  step,
  skillManagers,
}: RunSnapshot["context"]): Promise<RunEvent> {
  if (!step.toolCall) {
    throw new Error("No tool call found")
  }
  const { id, toolName, args } = step.toolCall
  const skillManager = await getSkillManagerByToolName(skillManagers, toolName)
  if (!skillManager.expert) {
    throw new Error(`Delegation error: skill manager "${toolName}" not found`)
  }
  if (!args || !args.query || typeof args.query !== "string") {
    throw new Error("Delegation error: query is undefined")
  }
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
    },
    step: {
      ...step,
      finishedAt: new Date().getTime(),
    },
  })
}
