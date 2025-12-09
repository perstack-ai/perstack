import { createId } from "@paralleldrive/cuid2"
import {
  type Checkpoint,
  createRuntimeEvent,
  type Job,
  type RunEvent,
  type RunParamsInput,
  type RunSetting,
  type RuntimeEvent,
  runParamsSchema,
  type Step,
} from "@perstack/core"
import pkg from "../package.json" with { type: "json" }
import {
  buildDelegateToState,
  buildDelegationReturnState,
  createInitialCheckpoint,
  createNextStepCheckpoint,
} from "./checkpoint-helpers.js"
import {
  defaultRetrieveCheckpoint,
  defaultStoreCheckpoint,
  defaultStoreEvent,
} from "./default-store.js"
import { RunEventEmitter } from "./events/event-emitter.js"
import { executeStateMachine } from "./execute-state-machine.js"
import { createInitialJob, retrieveJob, storeJob } from "./job-store.js"
import { getContextWindow } from "./model.js"
import {
  defaultGetRunDir,
  type FileSystem,
  type GetRunDirFn,
  storeRunSetting,
} from "./run-setting-store.js"
import { type ResolveExpertToRunFn, setupExperts } from "./setup-experts.js"
import { getSkillManagers } from "./skill-manager/index.js"

export async function run(
  runInput: RunParamsInput,
  options?: {
    shouldContinueRun?: (
      setting: RunSetting,
      checkpoint: Checkpoint,
      step: Step,
    ) => Promise<boolean>
    retrieveCheckpoint?: (jobId: string, checkpointId: string) => Promise<Checkpoint>
    storeCheckpoint?: (checkpoint: Checkpoint) => Promise<void>
    eventListener?: (event: RunEvent | RuntimeEvent) => void
    resolveExpertToRun?: ResolveExpertToRunFn
    fileSystem?: FileSystem
    getRunDir?: GetRunDirFn
  },
): Promise<Checkpoint> {
  const runParams = runParamsSchema.parse(runInput)
  const eventListener = getEventListener(options)
  const retrieveCheckpoint = options?.retrieveCheckpoint ?? defaultRetrieveCheckpoint
  const storeCheckpoint = options?.storeCheckpoint ?? defaultStoreCheckpoint
  const eventEmitter = new RunEventEmitter()
  eventEmitter.subscribe(eventListener)
  let { setting, checkpoint } = runParams
  const contextWindow = getContextWindow(setting.providerConfig.providerName, setting.model)
  const getRunDir = options?.getRunDir ?? defaultGetRunDir
  await storeRunSetting(setting, options?.fileSystem, getRunDir)
  let job: Job =
    retrieveJob(setting.jobId) ??
    createInitialJob(setting.jobId, setting.expertKey, setting.maxSteps)
  if (job.status !== "running") {
    job = { ...job, status: "running", finishedAt: undefined }
  }
  storeJob(job)
  while (true) {
    const { expertToRun, experts } = await setupExperts(setting, options?.resolveExpertToRun)
    if (options?.eventListener) {
      const initEvent = createRuntimeEvent("initializeRuntime", setting.jobId, setting.runId, {
        runtimeVersion: pkg.version,
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
      options.eventListener(initEvent)
    }
    const skillManagers = await getSkillManagers(
      expertToRun,
      experts,
      setting,
      options?.eventListener,
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
      eventListener,
      skillManagers,
      eventEmitter,
      storeCheckpoint,
      shouldContinueRun: options?.shouldContinueRun,
    })
    job = {
      ...job,
      totalSteps: runResultCheckpoint.stepNumber,
      usage: runResultCheckpoint.usage,
    }
    switch (runResultCheckpoint.status) {
      case "completed": {
        if (runResultCheckpoint.delegatedBy) {
          storeJob(job)
          const parentCheckpoint = await retrieveCheckpoint(
            setting.jobId,
            runResultCheckpoint.delegatedBy.checkpointId,
          )
          const result = buildDelegationReturnState(setting, runResultCheckpoint, parentCheckpoint)
          setting = result.setting
          checkpoint = result.checkpoint
          break
        }
        storeJob({ ...job, status: "completed", finishedAt: Date.now() })
        return runResultCheckpoint
      }
      case "stoppedByInteractiveTool": {
        storeJob({ ...job, status: "stoppedByInteractiveTool" })
        return runResultCheckpoint
      }
      case "stoppedByDelegate": {
        storeJob(job)
        const result = buildDelegateToState(setting, runResultCheckpoint, expertToRun)
        setting = result.setting
        checkpoint = result.checkpoint
        break
      }
      case "stoppedByExceededMaxSteps": {
        storeJob({ ...job, status: "stoppedByMaxSteps", finishedAt: Date.now() })
        return runResultCheckpoint
      }
      case "stoppedByError": {
        storeJob({ ...job, status: "stoppedByError", finishedAt: Date.now() })
        return runResultCheckpoint
      }
      default:
        throw new Error("Run stopped by unknown reason")
    }
  }
}

function getEventListener(options?: { eventListener?: (event: RunEvent | RuntimeEvent) => void }) {
  const listener =
    options?.eventListener ?? ((e: RunEvent | RuntimeEvent) => console.log(JSON.stringify(e)))
  return async (event: RunEvent | RuntimeEvent) => {
    if ("stepNumber" in event) {
      await defaultStoreEvent(event)
    }
    listener(event)
  }
}

export { defaultGetRunDir as getRunDir }
