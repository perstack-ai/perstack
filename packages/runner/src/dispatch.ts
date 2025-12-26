import { createId } from "@paralleldrive/cuid2"
import type {
  Checkpoint,
  PerstackConfig,
  RunEvent,
  RunParamsInput,
  RuntimeEvent,
  RuntimeName,
} from "@perstack/core"
import {
  defaultRetrieveCheckpoint,
  defaultStoreCheckpoint,
  defaultStoreEvent,
} from "@perstack/filesystem-storage"
import { getAdapter, getRegisteredRuntimes, isAdapterAvailable } from "./registry.js"

export type DispatchParams = {
  setting: RunParamsInput["setting"]
  checkpoint?: Checkpoint
  runtime: RuntimeName
  config?: PerstackConfig
  eventListener?: (event: RunEvent | RuntimeEvent) => void
  storeCheckpoint?: (checkpoint: Checkpoint) => Promise<void>
  storeEvent?: (event: RunEvent) => Promise<void>
  retrieveCheckpoint?: (jobId: string, checkpointId: string) => Promise<Checkpoint>
  workspace?: string
  /** Additional environment variable names to pass to Docker runtime */
  additionalEnvKeys?: string[]
}

export type DispatchResult = {
  checkpoint: Checkpoint
}

export async function dispatchToRuntime(params: DispatchParams): Promise<DispatchResult> {
  const {
    checkpoint,
    runtime,
    config,
    eventListener,
    storeCheckpoint,
    storeEvent,
    retrieveCheckpoint,
    workspace,
    additionalEnvKeys,
  } = params
  const setting = {
    ...params.setting,
    jobId: params.setting.jobId ?? createId(),
    runId: createId(), // runId is always generated internally, never from external input
  }
  if (!isAdapterAvailable(runtime)) {
    const available = getRegisteredRuntimes().join(", ")
    throw new Error(`Runtime "${runtime}" is not available. Available runtimes: ${available}.`)
  }
  const adapter = getAdapter(runtime)
  const prereqResult = await adapter.checkPrerequisites()
  if (!prereqResult.ok) {
    const { error } = prereqResult
    let message = `Runtime "${runtime}" prerequisites not met: ${error.message}`
    if (error.helpUrl) {
      message += `\nSee: ${error.helpUrl}`
    }
    throw new Error(message)
  }
  const result = await adapter.run({
    setting,
    checkpoint,
    config,
    eventListener,
    storeCheckpoint: storeCheckpoint ?? defaultStoreCheckpoint,
    storeEvent: storeEvent ?? defaultStoreEvent,
    retrieveCheckpoint: retrieveCheckpoint ?? defaultRetrieveCheckpoint,
    workspace,
    additionalEnvKeys,
  })
  return { checkpoint: result.checkpoint }
}
