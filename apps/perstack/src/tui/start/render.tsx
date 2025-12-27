import { render } from "ink"
import type {
  CheckpointHistoryItem,
  EventHistoryItem,
  ExpertOption,
  InitialRuntimeConfig,
  JobHistoryItem,
  PerstackEvent,
} from "../types/index.js"
import { EventQueue } from "../utils/event-queue.js"
import { App } from "./app.js"

const createEventEmitter = () => {
  const eventQueue = new EventQueue()
  return {
    setHandler: (fn: (event: PerstackEvent) => void) => eventQueue.setHandler(fn),
    emit: (event: PerstackEvent) => eventQueue.emit(event),
  }
}

type RenderStartParams = {
  needsQueryInput: boolean
  showHistory: boolean
  initialExpertName: string | undefined
  initialQuery: string | undefined
  initialConfig: InitialRuntimeConfig
  configuredExperts: ExpertOption[]
  recentExperts: ExpertOption[]
  historyJobs: JobHistoryItem[]
  onContinue: (query: string) => void
  onResumeFromCheckpoint: (checkpoint: CheckpointHistoryItem) => void
  onLoadCheckpoints: (job: JobHistoryItem) => Promise<CheckpointHistoryItem[]>
  onLoadEvents: (
    job: JobHistoryItem,
    checkpoint: CheckpointHistoryItem,
  ) => Promise<EventHistoryItem[]>
  onLoadHistoricalEvents: (checkpoint: CheckpointHistoryItem) => Promise<PerstackEvent[]>
}

export async function renderStart(
  params: RenderStartParams,
): Promise<{ expertKey: string; query: string; eventListener: (event: PerstackEvent) => void }> {
  return new Promise((resolve, reject) => {
    const emitter = createEventEmitter()
    let resolved = false
    const { waitUntilExit } = render(
      <App
        needsQueryInput={params.needsQueryInput}
        showHistory={params.showHistory}
        initialExpertName={params.initialExpertName}
        initialQuery={params.initialQuery}
        initialConfig={params.initialConfig}
        configuredExperts={params.configuredExperts}
        recentExperts={params.recentExperts}
        historyJobs={params.historyJobs}
        onComplete={(expertKey, query) => {
          resolved = true
          resolve({
            expertKey,
            query,
            eventListener: emitter.emit,
          })
        }}
        onContinue={params.onContinue}
        onResumeFromCheckpoint={params.onResumeFromCheckpoint}
        onLoadCheckpoints={params.onLoadCheckpoints}
        onLoadEvents={params.onLoadEvents}
        onLoadHistoricalEvents={params.onLoadHistoricalEvents}
        onReady={emitter.setHandler}
      />,
    )
    waitUntilExit()
      .then(() => {
        if (!resolved) {
          reject(new Error("TUI exited without completing selection"))
        }
      })
      .catch(reject)
  })
}
