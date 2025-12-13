import { render } from "ink"
import React from "react"
import type { WizardExpertChoice } from "../../src/types/wizard.js"
import { PublishApp } from "./app.js"

type RenderPublishSelectOptions = {
  experts: WizardExpertChoice[]
}

export async function renderPublish(options: RenderPublishSelectOptions): Promise<string | null> {
  return new Promise((resolve) => {
    let selected: string | null = null
    const { waitUntilExit } = render(
      <PublishApp
        experts={options.experts}
        onSelect={(expertName) => {
          selected = expertName
        }}
      />,
    )
    waitUntilExit().then(() => {
      resolve(selected)
    })
  })
}
