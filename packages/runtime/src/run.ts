import type {
  Checkpoint,
  Job,
  RunEvent,
  RunParamsInput,
  RunSetting,
  RuntimeEvent,
  Step,
} from "@perstack/core"
import { runParamsSchema } from "@perstack/core"
import { createEmptyUsage, type ResolveExpertToRunFn } from "./helpers/index.js"
import {
  buildReturnFromDelegation,
  extractDelegationContext,
  SingleDelegationStrategy,
  SingleRunExecutor,
  selectDelegationStrategy,
} from "./orchestration/index.js"

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

const defaultCreateJob = (jobId: string, expertKey: string, maxSteps?: number): Job => ({
  id: jobId,
  coordinatorExpertKey: expertKey,
  status: "running",
  totalSteps: 0,
  startedAt: Date.now(),
  maxSteps,
  usage: createEmptyUsage(),
})

/**
 * Execute a run with the given parameters and options.
 * This is the main entry point for the runtime.
 *
 * The run loop handles:
 * - Job management
 * - Delegation routing (single vs parallel)
 * - Terminal state detection
 *
 * Each run execution is delegated to SingleRunExecutor.
 */
export async function run(runInput: RunParamsInput, options?: RunOptions): Promise<Checkpoint> {
  const runParams = runParamsSchema.parse(runInput)
  let { setting, checkpoint } = runParams

  const storeJob = options?.storeJob ?? (() => {})
  const retrieveJob = options?.retrieveJob ?? (() => undefined)
  const retrieveCheckpoint =
    options?.retrieveCheckpoint ??
    (async () => {
      throw new Error("retrieveCheckpoint not provided")
    })
  const createJob = options?.createJob ?? defaultCreateJob

  let job: Job =
    retrieveJob(setting.jobId) ?? createJob(setting.jobId, setting.expertKey, setting.maxSteps)
  if (job.status !== "running") {
    job = { ...job, status: "running", finishedAt: undefined }
  }
  storeJob(job)

  const runExecutor = new SingleRunExecutor({
    shouldContinueRun: options?.shouldContinueRun,
    storeCheckpoint: options?.storeCheckpoint,
    eventListener: options?.eventListener,
    resolveExpertToRun: options?.resolveExpertToRun,
  })

  while (true) {
    const runResult = await runExecutor.execute(setting, checkpoint)
    const resultCheckpoint = runResult.checkpoint

    job = {
      ...job,
      totalSteps: resultCheckpoint.stepNumber,
      usage: resultCheckpoint.usage,
    }

    switch (resultCheckpoint.status) {
      case "completed": {
        if (options?.returnOnDelegationComplete) {
          storeJob(job)
          return resultCheckpoint
        }
        if (resultCheckpoint.delegatedBy) {
          storeJob(job)
          const parentCheckpoint = await retrieveCheckpoint(
            setting.jobId,
            resultCheckpoint.delegatedBy.checkpointId,
          )
          const result = buildReturnFromDelegation(setting, resultCheckpoint, parentCheckpoint)
          setting = result.setting
          checkpoint = result.checkpoint
          break
        }
        storeJob({ ...job, status: "completed", finishedAt: Date.now() })
        return resultCheckpoint
      }

      case "stoppedByInteractiveTool": {
        storeJob({ ...job, status: "stoppedByInteractiveTool" })
        return resultCheckpoint
      }

      case "stoppedByDelegate": {
        storeJob(job)
        const { delegateTo } = resultCheckpoint
        if (!delegateTo || delegateTo.length === 0) {
          throw new Error("No delegations found in checkpoint")
        }
        const strategy = selectDelegationStrategy(delegateTo.length)
        const context = extractDelegationContext(resultCheckpoint)

        // SingleDelegationStrategy needs the full checkpoint for buildDelegateToState
        const delegationResult =
          strategy instanceof SingleDelegationStrategy
            ? await strategy.execute(
                delegateTo,
                setting,
                context,
                runResult.expertToRun,
                run,
                resultCheckpoint,
              )
            : await strategy.execute(delegateTo, setting, context, runResult.expertToRun, run)

        setting = delegationResult.nextSetting
        checkpoint = delegationResult.nextCheckpoint
        break
      }

      case "stoppedByExceededMaxSteps": {
        storeJob({ ...job, status: "stoppedByMaxSteps", finishedAt: Date.now() })
        return resultCheckpoint
      }

      case "stoppedByError": {
        storeJob({ ...job, status: "stoppedByError", finishedAt: Date.now() })
        return resultCheckpoint
      }

      default:
        throw new Error("Run stopped by unknown reason")
    }
  }
}
