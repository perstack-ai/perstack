import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { type Job, jobSchema } from "@perstack/core"

export function getJobDir(jobId: string): string {
  return `${process.cwd()}/perstack/jobs/${jobId}`
}

export function storeJob(job: Job): void {
  const jobDir = getJobDir(job.id)
  if (!existsSync(jobDir)) {
    mkdirSync(jobDir, { recursive: true })
  }
  const jobPath = path.resolve(jobDir, "job.json")
  writeFileSync(jobPath, JSON.stringify(job, null, 2))
}

export function retrieveJob(jobId: string): Job | undefined {
  const jobDir = getJobDir(jobId)
  const jobPath = path.resolve(jobDir, "job.json")
  if (!existsSync(jobPath)) {
    return undefined
  }
  const content = readFileSync(jobPath, "utf-8")
  return jobSchema.parse(JSON.parse(content))
}

export function createInitialJob(jobId: string, expertKey: string, maxSteps?: number): Job {
  return {
    id: jobId,
    status: "running",
    coordinatorExpertKey: expertKey,
    totalSteps: 0,
    maxSteps,
    usage: {
      inputTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      totalTokens: 0,
      cachedInputTokens: 0,
    },
    startedAt: Date.now(),
  }
}
