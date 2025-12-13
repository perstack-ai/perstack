import { render } from "ink"
import React from "react"
import type {
  CheckpointHistoryItem,
  EventHistoryItem,
  InitialRuntimeConfig,
  JobHistoryItem,
  PerstackEvent,
} from "../../src/types/index.js"
import { EventQueue } from "../../src/utils/event-queue.js"
import { App } from "./app.js"

const createEventEmitter = () => {
  const eventQueue = new EventQueue()
  return {
    setHandler: (fn: (event: PerstackEvent) => void) => eventQueue.setHandler(fn),
    emit: (event: PerstackEvent) => eventQueue.emit(event),
  }
}
type RenderTuiInteractiveOptions = {
  needsQueryInput?: boolean
  showHistory?: boolean
  initialExpertName?: string
  initialQuery?: string
  initialConfig: InitialRuntimeConfig
  configuredExperts?: Array<{ key: string; name: string }>
  recentExperts?: Array<{ key: string; name: string; lastUsed?: number }>
  historyJobs?: JobHistoryItem[]
  onContinue?: (query: string) => void
  onResumeFromCheckpoint?: (checkpoint: CheckpointHistoryItem) => void
  onLoadCheckpoints?: (job: JobHistoryItem) => Promise<CheckpointHistoryItem[]>
  onLoadEvents?: (
    job: JobHistoryItem,
    checkpoint: CheckpointHistoryItem,
  ) => Promise<EventHistoryItem[]>
  onLoadHistoricalEvents?: (checkpoint: CheckpointHistoryItem) => Promise<PerstackEvent[]>
  onError?: (error: unknown) => void
}

export async function renderStart(
  options: RenderTuiInteractiveOptions,
): Promise<{ expertKey: string; query: string; eventListener: (event: PerstackEvent) => void }> {
  return new Promise((resolve, reject) => {
    const emitter = createEventEmitter()
    let resolved = false
    const { waitUntilExit } = render(
      <App
        needsQueryInput={options.needsQueryInput}
        showHistory={options.showHistory}
        initialExpertName={options.initialExpertName}
        initialQuery={options.initialQuery}
        initialConfig={options.initialConfig}
        configuredExperts={options.configuredExperts}
        recentExperts={options.recentExperts}
        historyJobs={options.historyJobs}
        onComplete={(expertKey, query) => {
          resolved = true
          resolve({
            expertKey,
            query,
            eventListener: emitter.emit,
          })
        }}
        onContinue={options.onContinue}
        onResumeFromCheckpoint={options.onResumeFromCheckpoint}
        onLoadCheckpoints={options.onLoadCheckpoints}
        onLoadEvents={options.onLoadEvents}
        onLoadHistoricalEvents={options.onLoadHistoricalEvents}
        onReady={emitter.setHandler}
      />,
    )
    waitUntilExit()
      .then(() => {
        if (!resolved) {
          reject(new Error("TUI exited without completing selection"))
        }
      })
      .catch((error) => {
        options.onError?.(error)
        reject(error)
      })
  })
}
