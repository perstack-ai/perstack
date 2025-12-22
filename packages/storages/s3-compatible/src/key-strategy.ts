export interface KeyStrategy {
  getJobKey(jobId: string): string
  getCheckpointKey(jobId: string, checkpointId: string): string
  getCheckpointsPrefix(jobId: string): string
  getRunSettingKey(jobId: string, runId: string): string
  getEventKey(
    jobId: string,
    runId: string,
    timestamp: number,
    stepNumber: number,
    type: string,
  ): string
  getEventsPrefix(jobId: string, runId: string): string
  getJobsPrefix(): string
  parseEventKey(key: string): { timestamp: number; stepNumber: number; type: string } | null
}

export function createKeyStrategy(prefix: string): KeyStrategy {
  const normalizedPrefix = prefix.endsWith("/") ? prefix : prefix ? `${prefix}/` : ""

  return {
    getJobKey(jobId: string): string {
      return `${normalizedPrefix}jobs/${jobId}/job.json`
    },

    getCheckpointKey(jobId: string, checkpointId: string): string {
      return `${normalizedPrefix}jobs/${jobId}/checkpoints/${checkpointId}.json`
    },

    getCheckpointsPrefix(jobId: string): string {
      return `${normalizedPrefix}jobs/${jobId}/checkpoints/`
    },

    getRunSettingKey(jobId: string, runId: string): string {
      return `${normalizedPrefix}jobs/${jobId}/runs/${runId}/run-setting.json`
    },

    getEventKey(
      jobId: string,
      runId: string,
      timestamp: number,
      stepNumber: number,
      type: string,
    ): string {
      return `${normalizedPrefix}jobs/${jobId}/runs/${runId}/event-${timestamp}-${stepNumber}-${type}.json`
    },

    getEventsPrefix(jobId: string, runId: string): string {
      return `${normalizedPrefix}jobs/${jobId}/runs/${runId}/`
    },

    getJobsPrefix(): string {
      return `${normalizedPrefix}jobs/`
    },

    parseEventKey(key: string): { timestamp: number; stepNumber: number; type: string } | null {
      const filename = key.split("/").pop()
      if (!filename?.startsWith("event-") || !filename.endsWith(".json")) {
        return null
      }
      const parts = filename.slice(6, -5).split("-")
      if (parts.length < 3) {
        return null
      }
      const timestamp = Number(parts[0])
      const stepNumber = Number(parts[1])
      const type = parts.slice(2).join("-")
      if (Number.isNaN(timestamp) || Number.isNaN(stepNumber)) {
        return null
      }
      return { timestamp, stepNumber, type }
    },
  }
}
