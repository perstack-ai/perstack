import type {
  Checkpoint,
  RunEvent,
  RunParamsInput,
  RuntimeEvent,
  RuntimeName,
} from "@perstack/core"
import { defaultStoreCheckpoint, getAdapter, isAdapterAvailable } from "@perstack/runtime"

export type DispatchParams = {
  setting: RunParamsInput["setting"]
  checkpoint?: Checkpoint
  runtime: RuntimeName
  eventListener?: (event: RunEvent | RuntimeEvent) => void
  storeCheckpoint?: (checkpoint: Checkpoint) => Promise<void>
}

export type DispatchResult = {
  checkpoint: Checkpoint
}

export async function dispatchToRuntime(params: DispatchParams): Promise<DispatchResult> {
  const { setting, checkpoint, runtime, eventListener, storeCheckpoint } = params
  if (!isAdapterAvailable(runtime)) {
    throw new Error(
      `Runtime "${runtime}" is not available. ` +
        `Available runtimes: perstack, cursor, claude-code, gemini.`,
    )
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
    eventListener,
    storeCheckpoint: storeCheckpoint ?? defaultStoreCheckpoint,
  })
  return { checkpoint: result.checkpoint }
}
