import { useApp } from "ink"
import React from "react"
import { WizardExpertSelector } from "../../src/components/index.js"
import type { WizardExpertChoice } from "../../src/types/wizard.js"

type PublishAppProps = {
  experts: WizardExpertChoice[]
  onSelect: (expertName: string) => void
}
export function PublishApp({ experts, onSelect }: PublishAppProps) {
  const { exit } = useApp()
  const handleSelect = (name: string) => {
    onSelect(name)
    exit()
  }
  return (
    <WizardExpertSelector
      title="Select an Expert to publish:"
      experts={experts}
      onSelect={handleSelect}
    />
  )
}
