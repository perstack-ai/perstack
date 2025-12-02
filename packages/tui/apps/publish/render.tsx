import { render } from "ink"
import { PublishApp } from "./app.js"

type ExpertChoice = {
  name: string
  description?: string
}

type RenderPublishSelectOptions = {
  experts: ExpertChoice[]
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
