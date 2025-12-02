import { render } from "ink"
import {
  type ExpertChoice,
  UnpublishApp,
  type UnpublishWizardResult,
  type VersionInfo,
} from "./app.js"

type RenderUnpublishOptions = {
  experts: ExpertChoice[]
  onFetchVersions: (expertName: string) => Promise<VersionInfo[]>
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
export type { ExpertChoice, VersionInfo, UnpublishWizardResult }
