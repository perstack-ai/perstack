import type { Checkpoint, Expert, RunEvent, RunParamsInput, RuntimeEvent } from "@perstack/core"

export type AdapterRunParams = {
  setting: RunParamsInput["setting"]
  checkpoint?: Checkpoint
  eventListener?: (event: RunEvent | RuntimeEvent) => void
}

export type AdapterRunResult = {
  checkpoint: Checkpoint
  events: (RunEvent | RuntimeEvent)[]
}

export interface RuntimeAdapter {
  readonly name: string
  checkPrerequisites(): Promise<PrerequisiteResult>
  convertExpert(expert: Expert): RuntimeExpertConfig
  run(params: AdapterRunParams): Promise<AdapterRunResult>
}

export type PrerequisiteResult = { ok: true } | { ok: false; error: PrerequisiteError }

export type PrerequisiteError = {
  type: "cli-not-found" | "auth-missing" | "version-mismatch"
  message: string
  helpUrl?: string
}

export type RuntimeExpertConfig = {
  instruction: string
}
