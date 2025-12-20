import type { Checkpoint, Expert, RunEvent, RunSetting, RuntimeEvent, Step } from "@perstack/core"
import type { RunEventEmitter } from "../events/event-emitter.js"
import type { LLMExecutor } from "../llm/index.js"
import type { BaseSkillManager } from "../skill-manager/index.js"
import { StateMachineCoordinator } from "./coordinator.js"

export type ExecuteStateMachineParams = {
  setting: RunSetting & { experts: Record<string, Expert> }
  initialCheckpoint: Checkpoint
  eventListener: (event: RunEvent | RuntimeEvent) => Promise<void>
  skillManagers: Record<string, BaseSkillManager>
  llmExecutor: LLMExecutor
  eventEmitter: RunEventEmitter
  storeCheckpoint: (checkpoint: Checkpoint) => Promise<void>
  shouldContinueRun?: (setting: RunSetting, checkpoint: Checkpoint, step: Step) => Promise<boolean>
}

/**
 * Execute the runtime state machine.
 * This is a convenience wrapper around StateMachineCoordinator.
 */
export async function executeStateMachine(params: ExecuteStateMachineParams): Promise<Checkpoint> {
  const coordinator = new StateMachineCoordinator(params)
  return coordinator.execute()
}
