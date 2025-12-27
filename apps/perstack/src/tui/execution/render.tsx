import type { PerstackEvent } from "@perstack/core"
import { render } from "ink"
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
  let eventHandler: ((event: PerstackEvent) => void) | null = null

  const result = new Promise<ExecutionResult>((resolve, reject) => {
    const { waitUntilExit } = render(
      <ExecutionApp
        {...params}
        onReady={(handler) => {
          eventHandler = handler
        }}
        onComplete={resolve}
      />,
    )

    waitUntilExit().catch(reject)
  })

  return {
    result,
    eventListener: (event: PerstackEvent) => {
      if (eventHandler) {
        eventHandler(event)
      }
    },
  }
}

