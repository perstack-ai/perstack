import { render } from "ink"
import { type ExpertChoice, TagApp, type TagWizardResult, type VersionInfo } from "./app.js"

type RenderTagWizardOptions = {
  experts: ExpertChoice[]
  onFetchVersions: (expertName: string) => Promise<VersionInfo[]>
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

export type { ExpertChoice, VersionInfo, TagWizardResult }
