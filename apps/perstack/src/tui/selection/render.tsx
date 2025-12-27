import { render } from "ink"
import { SelectionApp } from "./app.js"
import type { SelectionParams, SelectionResult } from "./types.js"

/**
 * Renders the selection TUI phase.
 * Returns a promise that resolves with the selection result (expert, query, checkpoint).
 */
export async function renderSelection(params: SelectionParams): Promise<SelectionResult> {
  return new Promise((resolve, reject) => {
    let resolved = false

    const { waitUntilExit } = render(
      <SelectionApp
        {...params}
        onComplete={(result) => {
          resolved = true
          resolve(result)
        }}
      />,
    )

    waitUntilExit()
      .then(() => {
        if (!resolved) {
          reject(new Error("Selection cancelled"))
        }
      })
      .catch(reject)
  })
}
