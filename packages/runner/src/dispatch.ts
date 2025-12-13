import type {
  Checkpoint,
  PerstackConfig,
  RunEvent,
  RunParamsInput,
  RuntimeEvent,
  RuntimeName,
} from "@perstack/core"
import { defaultRetrieveCheckpoint, defaultStoreCheckpoint } from "@perstack/storage"
import { getAdapter, getRegisteredRuntimes, isAdapterAvailable } from "./registry.js"
export type DispatchParams = {
  setting: RunParamsInput["setting"]
  checkpoint?: Checkpoint
  runtime: RuntimeName
  config?: PerstackConfig
  eventListener?: (event: RunEvent | RuntimeEvent) => void
  storeCheckpoint?: (checkpoint: Checkpoint) => Promise<void>
  retrieveCheckpoint?: (jobId: string, checkpointId: string) => Promise<Checkpoint>
}

export type DispatchResult = {
  checkpoint: Checkpoint
}

export async function dispatchToRuntime(params: DispatchParams): Promise<DispatchResult> {
  const {
    setting,
    checkpoint,
    runtime,
    config,
    eventListener,
    storeCheckpoint,
    retrieveCheckpoint,
  } = params
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
    retrieveCheckpoint: retrieveCheckpoint ?? defaultRetrieveCheckpoint,
  })
  return { checkpoint: result.checkpoint }
}
