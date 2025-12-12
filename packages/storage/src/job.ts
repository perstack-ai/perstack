import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { type Job, jobSchema } from "@perstack/core"

export function getJobsDir(): string {
  return `${process.cwd()}/perstack/jobs`
}

export function getJobDir(jobId: string): string {
  return `${getJobsDir()}/${jobId}`
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

export function getAllJobs(): Job[] {
  const jobsDir = getJobsDir()
  if (!existsSync(jobsDir)) {
    return []
  }
  const jobDirNames = readdirSync(jobsDir, { withFileTypes: true })
    .filter((dir) => dir.isDirectory())
    .map((dir) => dir.name)
  if (jobDirNames.length === 0) {
    return []
  }
  const jobs: Job[] = []
  for (const jobDirName of jobDirNames) {
    const jobPath = path.resolve(jobsDir, jobDirName, "job.json")
    if (!existsSync(jobPath)) {
      continue
    }
    try {
      const content = readFileSync(jobPath, "utf-8")
      jobs.push(jobSchema.parse(JSON.parse(content)))
    } catch {
      // Ignore invalid jobs
    }
  }
  return jobs.sort((a, b) => b.startedAt - a.startedAt)
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
