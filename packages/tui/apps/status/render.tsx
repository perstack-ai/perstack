import { render } from "ink"
import { type ExpertChoice, StatusApp, type StatusWizardResult, type VersionInfo } from "./app.js"

type RenderStatusWizardOptions = {
  experts: ExpertChoice[]
  onFetchVersions: (expertName: string) => Promise<VersionInfo[]>
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

export type { ExpertChoice, VersionInfo, StatusWizardResult }
