export type WizardExpertChoice = {
  name: string
  description?: string
}
export type WizardVersionInfo = {
  key: string
  version: string
  tags: string[]
  status: "available" | "deprecated" | "disabled"
}
