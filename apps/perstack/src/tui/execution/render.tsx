import type { PerstackEvent } from "@perstack/core"
import { render } from "ink"
import { EventQueue } from "../utils/event-queue.js"
import { ExecutionApp } from "./app.js"
import type { ExecutionParams, ExecutionResult } from "./types.js"

type RenderExecutionResult = {
  result: Promise<ExecutionResult>
  eventListener: (event: PerstackEvent) => void
}

/**
 * Renders the execution TUI phase.
 * Returns a promise that resolves with the execution result (next query or null).
 * Also returns an event listener to feed events into the TUI.
 */
export function renderExecution(params: ExecutionParams): RenderExecutionResult {
  const eventQueue = new EventQueue()

  const result = new Promise<ExecutionResult>((resolve, reject) => {
    let resolved = false

    const { waitUntilExit } = render(
      <ExecutionApp
        {...params}
        onReady={(handler) => {
          eventQueue.setHandler(handler)
        }}
        onComplete={(result) => {
          resolved = true
          resolve(result)
        }}
      />,
    )

    waitUntilExit()
      .then(() => {
        if (!resolved) {
          reject(new Error("Execution cancelled"))
        }
      })
      .catch(reject)
  })

  return {
    result,
    eventListener: (event: PerstackEvent) => {
      eventQueue.emit(event)
    },
  }
}
