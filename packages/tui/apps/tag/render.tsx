import { render } from "ink"
import type { WizardExpertChoice, WizardVersionInfo } from "../../src/types/wizard.js"
import { TagApp, type TagWizardResult } from "./app.js"

type RenderTagWizardOptions = {
  experts: WizardExpertChoice[]
  onFetchVersions: (expertName: string) => Promise<WizardVersionInfo[]>
}

export async function renderTag(options: RenderTagWizardOptions): Promise<TagWizardResult | null> {
  return new Promise((resolve) => {
    let result: TagWizardResult | null = null
    const { waitUntilExit } = render(
      <TagApp
        experts={options.experts}
        onFetchVersions={options.onFetchVersions}
        onComplete={(r) => {
          result = r
        }}
        onCancel={() => {
          result = null
        }}
      />,
    )
    waitUntilExit().then(() => {
      resolve(result)
    })
  })
}

export type { TagWizardResult }
export type { WizardExpertChoice, WizardVersionInfo } from "../../src/types/wizard.js"
