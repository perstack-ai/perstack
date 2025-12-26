import type { Checkpoint } from "../schemas/checkpoint.js"
import type { Expert } from "../schemas/expert.js"
import type { PerstackConfig } from "../schemas/perstack-toml.js"
import type { RunEvent, RunParamsInput, RuntimeEvent } from "../schemas/runtime.js"

/** Setting type for adapter run - external input with required jobId and runId added by dispatcher */
export type AdapterRunSetting = RunParamsInput["setting"] & {
  jobId: string
  runId: string
}

export type AdapterRunParams = {
  setting: AdapterRunSetting
  config?: PerstackConfig
  checkpoint?: Checkpoint
  eventListener?: (event: RunEvent | RuntimeEvent) => void
  storeCheckpoint?: (checkpoint: Checkpoint) => Promise<void>
  storeEvent?: (event: RunEvent) => Promise<void>
  retrieveCheckpoint?: (jobId: string, checkpointId: string) => Promise<Checkpoint>
  workspace?: string
  /** Additional environment variable names to pass to Docker runtime */
  additionalEnvKeys?: string[]
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
