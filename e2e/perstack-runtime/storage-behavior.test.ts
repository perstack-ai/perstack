import { existsSync, readdirSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { runCli, withEventParsing } from "../lib/runner.js"

const STORAGE_DIR = path.join(process.cwd(), "perstack", "jobs")
const GLOBAL_RUNTIME_CONFIG = "./e2e/experts/global-runtime.toml"
// LLM API calls require extended timeout
const LLM_TIMEOUT = 120000

function getJobIds(): Set<string> {
  if (!existsSync(STORAGE_DIR)) {
    return new Set()
  }
  return new Set(
    readdirSync(STORAGE_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name),
  )
}

describe.concurrent("Storage Behavior", () => {
  it(
    "should create storage files when running expert via perstack CLI",
    async () => {
      const jobsBefore = getJobIds()
      const cmdResult = await runCli(
        ["run", "--config", GLOBAL_RUNTIME_CONFIG, "e2e-global-runtime", "Say hello"],
        { timeout: LLM_TIMEOUT },
      )
      const result = withEventParsing(cmdResult)
      expect(result.exitCode).toBe(0)
      expect(result.jobId).not.toBeNull()
      const jobsAfter = getJobIds()
      expect(jobsAfter.has(result.jobId!)).toBe(true)
      expect(jobsAfter.size).toBeGreaterThan(jobsBefore.size)
    },
    LLM_TIMEOUT,
  )
})
