import type { Checkpoint, Expert, RunEvent, RunSetting, RuntimeEvent, Step } from "@perstack/core"
import type { RunEventEmitter } from "../events/event-emitter.js"
import type { LLMExecutor } from "../llm/index.js"
import { type BaseSkillManager, closeSkillManagers } from "../skill-manager/index.js"
import { type ActorFactory, defaultActorFactory } from "./actor-factory.js"
import { type RunActor, type RunSnapshot, StateMachineLogics } from "./machine.js"

export type StateMachineParams = {
  setting: RunSetting & { experts: Record<string, Expert> }
  initialCheckpoint: Checkpoint
  eventListener: (event: RunEvent | RuntimeEvent) => Promise<void>
  skillManagers: Record<string, BaseSkillManager>
  llmExecutor: LLMExecutor
  eventEmitter: RunEventEmitter
  storeCheckpoint: (checkpoint: Checkpoint) => Promise<void>
  shouldContinueRun?: (setting: RunSetting, checkpoint: Checkpoint, step: Step) => Promise<boolean>
}

export type StateMachineLogicsType = typeof StateMachineLogics

export interface CoordinatorDependencies {
  actorFactory?: ActorFactory
  closeSkillManagers?: (managers: Record<string, BaseSkillManager>) => Promise<void>
  logics?: StateMachineLogicsType
}

/**
 * Coordinator class for managing the runtime state machine execution.
 * Provides dependency injection for improved testability.
 */
export class StateMachineCoordinator {
  private readonly actorFactory: ActorFactory
  private readonly closeManagers: (managers: Record<string, BaseSkillManager>) => Promise<void>
  private readonly logics: StateMachineLogicsType

  private actor: RunActor | null = null
  private resolvePromise: ((checkpoint: Checkpoint) => void) | null = null
  private rejectPromise: ((error: Error) => void) | null = null

  constructor(
    private readonly params: StateMachineParams,
    deps: CoordinatorDependencies = {},
  ) {
    this.actorFactory = deps.actorFactory ?? defaultActorFactory
    this.closeManagers = deps.closeSkillManagers ?? closeSkillManagers
    this.logics = deps.logics ?? StateMachineLogics
  }

  /**
   * Execute the state machine and return the final checkpoint.
   */
  async execute(): Promise<Checkpoint> {
    const { setting, initialCheckpoint, eventListener, skillManagers, llmExecutor } = this.params

    this.actor = this.actorFactory.create({
      input: {
        setting,
        initialCheckpoint,
        eventListener,
        skillManagers,
        llmExecutor,
      },
    })

    return new Promise<Checkpoint>((resolve, reject) => {
      this.resolvePromise = resolve
      this.rejectPromise = reject

      this.actor!.subscribe((runState) => {
        this.handleStateChange(runState).catch((error) => {
          this.handleError(error)
        })
      })

      this.actor!.start()
    })
  }

  /**
   * Handle state changes from the actor.
   * Exported for testing purposes.
   */
  async handleStateChange(runState: RunSnapshot): Promise<void> {
    if (runState.value === "Stopped") {
      await this.handleStoppedState(runState)
    } else {
      await this.handleActiveState(runState)
    }
  }

  /**
   * Handle the stopped state - cleanup and resolve.
   */
  private async handleStoppedState(runState: RunSnapshot): Promise<void> {
    const { checkpoint, skillManagers } = runState.context

    if (!checkpoint) {
      throw new Error("Checkpoint is undefined")
    }

    await this.closeManagers(skillManagers)
    this.resolvePromise?.(checkpoint)
  }

  /**
   * Handle active states - execute logic, store checkpoint, emit events.
   */
  private async handleActiveState(runState: RunSnapshot): Promise<void> {
    const { eventEmitter, storeCheckpoint, shouldContinueRun } = this.params
    const stateValue = runState.value as Exclude<RunSnapshot["value"], "Stopped">

    const event = await this.logics[stateValue](runState.context)

    if ("checkpoint" in event) {
      await storeCheckpoint(event.checkpoint)
    }

    await eventEmitter.emit(event)

    if (shouldContinueRun) {
      const shouldContinue = await shouldContinueRun(
        runState.context.setting,
        runState.context.checkpoint,
        runState.context.step,
      )

      if (!shouldContinue) {
        this.actor?.stop()
        await this.closeManagers(runState.context.skillManagers)
        this.resolvePromise?.(runState.context.checkpoint)
        return
      }
    }

    this.actor?.send(event)
  }

  /**
   * Handle errors - cleanup and reject.
   */
  private async handleError(error: unknown): Promise<void> {
    await this.closeManagers(this.params.skillManagers).catch(() => {})
    this.rejectPromise?.(error instanceof Error ? error : new Error(String(error)))
  }
}
