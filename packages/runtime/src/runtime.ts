import { createId } from "@paralleldrive/cuid2"
import {
  type Checkpoint,
  createRuntimeEvent,
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
    retrieveCheckpoint?: (runId: string, checkpointId: string) => Promise<Checkpoint>
    storeCheckpoint?: (checkpoint: Checkpoint, timestamp: number) => Promise<void>
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
  while (true) {
    const { expertToRun, experts } = await setupExperts(setting, options?.resolveExpertToRun)
    if (options?.eventListener) {
      const initEvent = createRuntimeEvent("initializeRuntime", setting.runId, {
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
    switch (runResultCheckpoint.status) {
      case "completed": {
        if (runResultCheckpoint.delegatedBy) {
          const parentCheckpoint = await retrieveCheckpoint(
            setting.runId,
            runResultCheckpoint.delegatedBy.checkpointId,
          )
          const result = buildDelegationReturnState(setting, runResultCheckpoint, parentCheckpoint)
          setting = result.setting
          checkpoint = result.checkpoint
          break
        }
        return runResultCheckpoint
      }
      case "stoppedByInteractiveTool": {
        return runResultCheckpoint
      }
      case "stoppedByDelegate": {
        const result = buildDelegateToState(setting, runResultCheckpoint, expertToRun)
        setting = result.setting
        checkpoint = result.checkpoint
        break
      }
      case "stoppedByExceededMaxSteps": {
        return runResultCheckpoint
      }
      case "stoppedByError": {
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
