import { render } from "ink"
import type { WizardExpertChoice, WizardVersionInfo } from "../../src/types/wizard.js"
import { UnpublishApp, type UnpublishWizardResult } from "./app.js"

type RenderUnpublishOptions = {
  experts: WizardExpertChoice[]
  onFetchVersions: (expertName: string) => Promise<WizardVersionInfo[]>
}
export async function renderUnpublish(
  options: RenderUnpublishOptions,
): Promise<UnpublishWizardResult | null> {
  return new Promise((resolve) => {
    let result: UnpublishWizardResult | null = null
    const { waitUntilExit } = render(
      <UnpublishApp
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
export type { UnpublishWizardResult }
export type { WizardExpertChoice, WizardVersionInfo } from "../../src/types/wizard.js"
