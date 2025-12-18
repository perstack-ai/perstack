import { createId } from "@paralleldrive/cuid2"
import {
  type Checkpoint,
  createRuntimeEvent,
  type Expert,
  type Job,
  type RunEvent,
  type RunParamsInput,
  type RunSetting,
  type RuntimeEvent,
  runParamsSchema,
  type Step,
} from "@perstack/core"
import pkg from "../../package.json" with { type: "json" }
import { RunEventEmitter } from "../events/event-emitter.js"
import {
  createEmptyUsage,
  createInitialCheckpoint,
  createNextStepCheckpoint,
  getContextWindow,
  type ResolveExpertToRunFn,
  setupExperts,
  sumUsage,
} from "../helpers/index.js"
import { getSkillManagers } from "../skill-manager/index.js"
import { executeStateMachine } from "../state-machine/index.js"
import { DelegationHandler } from "./delegation-handler.js"

export type RunOptions = {
  shouldContinueRun?: (setting: RunSetting, checkpoint: Checkpoint, step: Step) => Promise<boolean>
  retrieveCheckpoint?: (jobId: string, checkpointId: string) => Promise<Checkpoint>
  storeCheckpoint?: (checkpoint: Checkpoint) => Promise<void>
  storeEvent?: (event: RunEvent) => Promise<void>
  storeJob?: (job: Job) => void
  retrieveJob?: (jobId: string) => Job | undefined
  createJob?: (jobId: string, expertKey: string, maxSteps?: number) => Job
  eventListener?: (event: RunEvent | RuntimeEvent) => void
  resolveExpertToRun?: ResolveExpertToRunFn
  returnOnDelegationComplete?: boolean
}

/**
 * Orchestrator for the run loop.
 * Coordinates expert resolution, skill manager initialization, state machine execution,
 * and delegation handling.
 */
export class RunOrchestrator {
  private storeCheckpoint: (checkpoint: Checkpoint) => Promise<void>
  private storeEvent: (event: RunEvent) => Promise<void>
  private storeJob: (job: Job) => void
  private retrieveJob: (jobId: string) => Job | undefined
  private retrieveCheckpoint: (jobId: string, checkpointId: string) => Promise<Checkpoint>
  private createJob: (jobId: string, expertKey: string, maxSteps?: number) => Job
  private eventListener: (event: RunEvent | RuntimeEvent) => Promise<void>
  private delegationHandler: DelegationHandler

  constructor(
    private options: RunOptions = {},
    runFn: (params: RunParamsInput, options?: RunOptions) => Promise<Checkpoint>,
  ) {
    this.storeCheckpoint = options.storeCheckpoint ?? (async () => {})
    this.storeEvent = options.storeEvent ?? (async () => {})
    this.storeJob = options.storeJob ?? (() => {})
    this.retrieveJob = options.retrieveJob ?? (() => undefined)
    this.retrieveCheckpoint =
      options.retrieveCheckpoint ??
      (async () => {
        throw new Error("retrieveCheckpoint not provided")
      })
    this.createJob = options.createJob ?? this.defaultCreateJob
    this.eventListener = this.createEventListener(options.eventListener, this.storeEvent)
    this.delegationHandler = new DelegationHandler(runFn, sumUsage)
  }

  private defaultCreateJob(jobId: string, expertKey: string, maxSteps?: number): Job {
    return {
      id: jobId,
      coordinatorExpertKey: expertKey,
      status: "running",
      totalSteps: 0,
      startedAt: Date.now(),
      maxSteps,
      usage: createEmptyUsage(),
    }
  }

  private createEventListener(
    userListener?: (event: RunEvent | RuntimeEvent) => void,
    storeEvent?: (event: RunEvent) => Promise<void>,
  ): (event: RunEvent | RuntimeEvent) => Promise<void> {
    const listener =
      userListener ?? ((e: RunEvent | RuntimeEvent) => console.log(JSON.stringify(e)))
    return async (event: RunEvent | RuntimeEvent) => {
      if ("stepNumber" in event && storeEvent) {
        await storeEvent(event as RunEvent)
      }
      listener(event)
    }
  }

  async execute(runInput: RunParamsInput): Promise<Checkpoint> {
    const runParams = runParamsSchema.parse(runInput)
    let { setting, checkpoint } = runParams
    const contextWindow = getContextWindow(setting.providerConfig.providerName, setting.model)

    let job: Job =
      this.retrieveJob(setting.jobId) ??
      this.createJob(setting.jobId, setting.expertKey, setting.maxSteps)
    if (job.status !== "running") {
      job = { ...job, status: "running", finishedAt: undefined }
    }
    this.storeJob(job)

    const eventEmitter = new RunEventEmitter()
    eventEmitter.subscribe(this.eventListener)

    while (true) {
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

      const runResultCheckpoint = await executeStateMachine({
        setting: { ...setting, experts },
        initialCheckpoint,
        eventListener: this.eventListener,
        skillManagers,
        eventEmitter,
        storeCheckpoint: this.storeCheckpoint,
        shouldContinueRun: this.options.shouldContinueRun,
      })

      job = {
        ...job,
        totalSteps: runResultCheckpoint.stepNumber,
        usage: runResultCheckpoint.usage,
      }

      const result = await this.handleCheckpointResult(
        runResultCheckpoint,
        setting,
        expertToRun,
        job,
      )

      if (result.terminal) {
        return result.checkpoint
      }

      setting = result.nextSetting!
      checkpoint = result.nextCheckpoint!
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

  private async handleCheckpointResult(
    checkpoint: Checkpoint,
    setting: RunSetting,
    expertToRun: Expert,
    job: Job,
  ): Promise<{
    terminal: boolean
    checkpoint: Checkpoint
    nextSetting?: RunSetting
    nextCheckpoint?: Checkpoint
  }> {
    switch (checkpoint.status) {
      case "completed":
        return this.handleCompleted(checkpoint, setting, job)

      case "stoppedByInteractiveTool":
        this.storeJob({ ...job, status: "stoppedByInteractiveTool" })
        return { terminal: true, checkpoint }

      case "stoppedByDelegate":
        return this.handleDelegate(checkpoint, setting, expertToRun, job)

      case "stoppedByExceededMaxSteps":
        this.storeJob({ ...job, status: "stoppedByMaxSteps", finishedAt: Date.now() })
        return { terminal: true, checkpoint }

      case "stoppedByError":
        this.storeJob({ ...job, status: "stoppedByError", finishedAt: Date.now() })
        return { terminal: true, checkpoint }

      default:
        throw new Error("Run stopped by unknown reason")
    }
  }

  private async handleCompleted(
    checkpoint: Checkpoint,
    setting: RunSetting,
    job: Job,
  ): Promise<{
    terminal: boolean
    checkpoint: Checkpoint
    nextSetting?: RunSetting
    nextCheckpoint?: Checkpoint
  }> {
    if (this.options.returnOnDelegationComplete) {
      this.storeJob(job)
      return { terminal: true, checkpoint }
    }

    if (checkpoint.delegatedBy) {
      this.storeJob(job)
      const parentCheckpoint = await this.retrieveCheckpoint(
        setting.jobId,
        checkpoint.delegatedBy.checkpointId,
      )
      const result = this.delegationHandler.buildDelegationReturnState(
        setting,
        checkpoint,
        parentCheckpoint,
      )
      return {
        terminal: false,
        checkpoint,
        nextSetting: result.setting,
        nextCheckpoint: result.checkpoint,
      }
    }

    this.storeJob({ ...job, status: "completed", finishedAt: Date.now() })
    return { terminal: true, checkpoint }
  }

  private async handleDelegate(
    checkpoint: Checkpoint,
    setting: RunSetting,
    expertToRun: Expert,
    job: Job,
  ): Promise<{
    terminal: boolean
    checkpoint: Checkpoint
    nextSetting?: RunSetting
    nextCheckpoint?: Checkpoint
  }> {
    this.storeJob(job)

    const { delegateTo } = checkpoint
    if (!delegateTo || delegateTo.length === 0) {
      throw new Error("No delegations found in checkpoint")
    }

    // Single delegation
    if (delegateTo.length === 1) {
      const result = this.delegationHandler.buildSingleDelegationState(
        setting,
        checkpoint,
        expertToRun,
      )
      return {
        terminal: false,
        checkpoint,
        nextSetting: result.setting,
        nextCheckpoint: result.checkpoint,
      }
    }

    // Multiple delegations in parallel
    const {
      firstResult,
      restToolResults,
      aggregatedUsage,
      maxStepNumber,
      remainingPendingToolCalls,
    } = await this.delegationHandler.executeMultipleDelegations(
      delegateTo,
      setting,
      checkpoint,
      expertToRun,
      this.options,
    )

    const nextSetting: RunSetting = {
      ...setting,
      expertKey: expertToRun.key,
      input: {
        interactiveToolCallResult: {
          toolCallId: firstResult.toolCallId,
          toolName: firstResult.toolName,
          skillName: `delegate/${firstResult.expertKey}`,
          text: firstResult.text,
        },
      },
    }

    const nextCheckpoint: Checkpoint = {
      ...checkpoint,
      status: "stoppedByDelegate",
      delegateTo: undefined,
      stepNumber: maxStepNumber,
      usage: aggregatedUsage,
      pendingToolCalls: remainingPendingToolCalls,
      partialToolResults: [...(checkpoint.partialToolResults ?? []), ...restToolResults],
    }

    return {
      terminal: false,
      checkpoint,
      nextSetting,
      nextCheckpoint,
    }
  }
}
