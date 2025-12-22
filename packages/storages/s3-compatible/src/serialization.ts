import {
  type Checkpoint,
  checkpointSchema,
  type Job,
  jobSchema,
  type RunEvent,
  type RunSetting,
  runSettingSchema,
} from "@perstack/core"

export function serializeCheckpoint(checkpoint: Checkpoint): string {
  return JSON.stringify(checkpoint)
}

export function deserializeCheckpoint(data: string): Checkpoint {
  return checkpointSchema.parse(JSON.parse(data))
}

export function serializeJob(job: Job): string {
  return JSON.stringify(job, null, 2)
}

export function deserializeJob(data: string): Job {
  return jobSchema.parse(JSON.parse(data))
}

export function serializeRunSetting(setting: RunSetting): string {
  return JSON.stringify(setting)
}

export function deserializeRunSetting(data: string): RunSetting {
  return runSettingSchema.parse(JSON.parse(data))
}

export function serializeEvent(event: RunEvent): string {
  return JSON.stringify(event)
}

export function deserializeEvent(data: string): RunEvent {
  return JSON.parse(data) as RunEvent
}
