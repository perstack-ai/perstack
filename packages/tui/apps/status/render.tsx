import { render } from "ink"
import type { WizardExpertChoice, WizardVersionInfo } from "../../src/types/wizard.js"
import { StatusApp, type StatusWizardResult } from "./app.js"

type RenderStatusWizardOptions = {
  experts: WizardExpertChoice[]
  onFetchVersions: (expertName: string) => Promise<WizardVersionInfo[]>
}

export async function renderStatus(
  options: RenderStatusWizardOptions,
): Promise<StatusWizardResult | null> {
  return new Promise((resolve) => {
    let result: StatusWizardResult | null = null
    const { waitUntilExit } = render(
      <StatusApp
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

export type { StatusWizardResult }
export type { WizardExpertChoice, WizardVersionInfo } from "../../src/types/wizard.js"
