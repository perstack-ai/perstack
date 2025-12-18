import { createId } from "@paralleldrive/cuid2"
import {
  type Checkpoint,
  createRuntimeEvent,
  type Expert,
  type RunEvent,
  type RunSetting,
  type RuntimeEvent,
  type Step,
} from "@perstack/core"
import pkg from "../../package.json" with { type: "json" }
import { RunEventEmitter } from "../events/event-emitter.js"
import {
  createInitialCheckpoint,
  createNextStepCheckpoint,
  getContextWindow,
  type ResolveExpertToRunFn,
  setupExperts,
} from "../helpers/index.js"
import { getSkillManagers } from "../skill-manager/index.js"
import { executeStateMachine } from "../state-machine/index.js"

export type SingleRunExecutorOptions = {
  shouldContinueRun?: (setting: RunSetting, checkpoint: Checkpoint, step: Step) => Promise<boolean>
  storeCheckpoint?: (checkpoint: Checkpoint) => Promise<void>
  storeEvent?: (event: RunEvent) => Promise<void>
  eventListener?: (event: RunEvent | RuntimeEvent) => void
  resolveExpertToRun?: ResolveExpertToRunFn
}

export type SingleRunResult = {
  checkpoint: Checkpoint
  expertToRun: Expert
  experts: Record<string, Expert>
}

/**
 * Executes a single run (state machine execution) without any loop or delegation handling.
 * This is the core orchestration unit that should NOT call run() recursively.
 *
 * Note: This executes a complete state machine run until it reaches a terminal state
 * (completed, stoppedByInteractiveTool, stoppedByDelegate, etc.), not just a single step.
 */
export class SingleRunExecutor {
  constructor(private options: SingleRunExecutorOptions = {}) {}

  async execute(setting: RunSetting, checkpoint?: Checkpoint): Promise<SingleRunResult> {
    const contextWindow = getContextWindow(setting.providerConfig.providerName, setting.model)
    const { expertToRun, experts } = await setupExperts(setting, this.options.resolveExpertToRun)

    this.emitInitEvent(setting, expertToRun, experts)

    const skillManagers = await getSkillManagers(
      expertToRun,
      experts,
      setting,
      this.options.eventListener,
      { isDelegatedRun: !!checkpoint?.delegatedBy },
    )

    const initialCheckpoint = checkpoint
      ? createNextStepCheckpoint(createId(), checkpoint)
      : createInitialCheckpoint(createId(), {
          jobId: setting.jobId,
          runId: setting.runId,
          expertKey: setting.expertKey,
          expert: expertToRun,
          contextWindow,
        })

    const eventEmitter = new RunEventEmitter()
    const eventListener = this.createEventListener()
    eventEmitter.subscribe(eventListener)

    const resultCheckpoint = await executeStateMachine({
      setting: { ...setting, experts },
      initialCheckpoint,
      eventListener,
      skillManagers,
      eventEmitter,
      storeCheckpoint: this.options.storeCheckpoint ?? (async () => {}),
      shouldContinueRun: this.options.shouldContinueRun,
    })

    return { checkpoint: resultCheckpoint, expertToRun, experts }
  }

  private createEventListener(): (event: RunEvent | RuntimeEvent) => Promise<void> {
    const userListener = this.options.eventListener
    const storeEvent = this.options.storeEvent
    return async (event: RunEvent | RuntimeEvent) => {
      // Store RunEvents (events with stepNumber) if storeEvent is provided
      if ("stepNumber" in event && storeEvent) {
        await storeEvent(event as RunEvent)
      }
      userListener?.(event)
    }
  }

  private emitInitEvent(
    setting: RunSetting,
    expertToRun: Expert,
    experts: Record<string, Expert>,
  ): void {
    if (!this.options.eventListener) return

    const initEvent = createRuntimeEvent("initializeRuntime", setting.jobId, setting.runId, {
      runtimeVersion: pkg.version,
      runtime: "local",
      expertName: expertToRun.name,
      experts: Object.keys(experts),
      model: setting.model,
      temperature: setting.temperature,
      maxSteps: setting.maxSteps,
      maxRetries: setting.maxRetries,
      timeout: setting.timeout,
      query: setting.input.text,
      interactiveToolCall: setting.input.interactiveToolCallResult,
    })
    this.options.eventListener(initEvent)
  }
}
