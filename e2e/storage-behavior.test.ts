import { existsSync, readdirSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { runExpert, runExpertWithRuntimeCli } from "./lib/runner.js"

const STORAGE_DIR = path.join(process.cwd(), "perstack", "jobs")

function getJobIds(): Set<string> {
  if (!existsSync(STORAGE_DIR)) {
    return new Set()
  }
  return new Set(readdirSync(STORAGE_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name))
}

describe("Storage Behavior", () => {
  describe("perstack CLI", () => {
    it("should create storage files when running expert", async () => {
      const jobsBefore = getJobIds()
      const result = await runExpert("e2e-global-runtime", "Say hello", {
        configPath: "./e2e/experts/global-runtime.toml",
        timeout: 120000,
      })
      expect(result.exitCode).toBe(0)
      expect(result.jobId).not.toBeNull()
      const jobsAfter = getJobIds()
      expect(jobsAfter.has(result.jobId!)).toBe(true)
      expect(jobsAfter.size).toBeGreaterThan(jobsBefore.size)
    }, 180000)
  })

  describe("perstack-runtime CLI", () => {
    it("should NOT create new storage files when running expert", async () => {
      const jobsBefore = getJobIds()
      const result = await runExpertWithRuntimeCli("e2e-global-runtime", "Say hello", {
        configPath: "./e2e/experts/global-runtime.toml",
        timeout: 120000,
      })
      expect(result.exitCode).toBe(0)
      const jobsAfter = getJobIds()
      const newJobs = [...jobsAfter].filter((id) => !jobsBefore.has(id))
      expect(newJobs.length).toBe(0)
    }, 180000)
  })
})
