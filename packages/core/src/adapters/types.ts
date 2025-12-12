import type { Checkpoint } from "../schemas/checkpoint.js"
import type { Expert } from "../schemas/expert.js"
import type { RunEvent, RunParamsInput, RuntimeEvent } from "../schemas/runtime.js"

export type AdapterRunParams = {
  setting: RunParamsInput["setting"]
  checkpoint?: Checkpoint
  eventListener?: (event: RunEvent | RuntimeEvent) => void
  storeCheckpoint?: (checkpoint: Checkpoint) => Promise<void>
  retrieveCheckpoint?: (jobId: string, checkpointId: string) => Promise<Checkpoint>
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
