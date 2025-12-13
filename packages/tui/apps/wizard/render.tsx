import { render } from "ink"
import React from "react"
import { App } from "./app.js"
import type { WizardOptions, WizardResult } from "./types.js"

export async function renderWizard(options: WizardOptions): Promise<WizardResult | null> {
  return new Promise((resolve) => {
    let result: WizardResult | null = null
    const { waitUntilExit } = render(
      <App
        llms={options.llms}
        runtimes={options.runtimes}
        isImprovement={options.isImprovement}
        improvementTarget={options.improvementTarget}
        onComplete={(wizardResult) => {
          result = wizardResult
        }}
      />,
    )
    waitUntilExit().then(() => resolve(result))
  })
}
