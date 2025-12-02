import type { Checkpoint, Expert, RunEvent, RunSetting, RuntimeEvent, Step } from "@perstack/core"
import { createActor } from "xstate"
import type { RunEventEmitter } from "./events/event-emitter.js"
import { runtimeStateMachine, StateMachineLogics } from "./runtime-state-machine.js"
import { closeSkillManagers, type SkillManager } from "./skill-manager.js"

export type ExecuteStateMachineParams = {
  setting: RunSetting & { experts: Record<string, Expert> }
  initialCheckpoint: Checkpoint
  eventListener: (event: RunEvent | RuntimeEvent) => Promise<void>
  skillManagers: Record<string, SkillManager>
  eventEmitter: RunEventEmitter
  storeCheckpoint: (checkpoint: Checkpoint, timestamp: number) => Promise<void>
  shouldContinueRun?: (setting: RunSetting, checkpoint: Checkpoint, step: Step) => Promise<boolean>
}

export async function executeStateMachine(params: ExecuteStateMachineParams): Promise<Checkpoint> {
  const {
    setting,
    initialCheckpoint,
    eventListener,
    skillManagers,
    eventEmitter,
    storeCheckpoint,
    shouldContinueRun,
  } = params
  const runActor = createActor(runtimeStateMachine, {
    input: {
      setting,
      initialCheckpoint,
      eventListener,
      skillManagers,
    },
  })
  return new Promise<Checkpoint>((resolve, reject) => {
    runActor.subscribe(async (runState) => {
      try {
        if (runState.value === "Stopped") {
          const { checkpoint, skillManagers } = runState.context
          if (!checkpoint) {
            throw new Error("Checkpoint is undefined")
          }
          await closeSkillManagers(skillManagers)
          resolve(checkpoint)
        } else {
          const event = await StateMachineLogics[runState.value](runState.context)
          if ("checkpoint" in event) {
            await storeCheckpoint(event.checkpoint, event.timestamp)
          }
          await eventEmitter.emit(event)
          if (shouldContinueRun) {
            const shouldContinue = await shouldContinueRun(
              runState.context.setting,
              runState.context.checkpoint,
              runState.context.step,
            )
            if (!shouldContinue) {
              runActor.stop()
              await closeSkillManagers(runState.context.skillManagers)
              resolve(runState.context.checkpoint)
              return
            }
          }
          runActor.send(event)
        }
      } catch (error) {
        await closeSkillManagers(skillManagers).catch(() => {})
        reject(error)
      }
    })
    runActor.start()
  })
}
