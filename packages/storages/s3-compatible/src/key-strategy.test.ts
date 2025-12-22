import { describe, expect, it } from "vitest"
import { createKeyStrategy } from "./key-strategy.js"

describe("createKeyStrategy", () => {
  describe("with no prefix", () => {
    const strategy = createKeyStrategy("")

    it("generates correct job key", () => {
      expect(strategy.getJobKey("job-123")).toBe("jobs/job-123/job.json")
    })

    it("generates correct checkpoint key", () => {
      expect(strategy.getCheckpointKey("job-123", "cp-456")).toBe(
        "jobs/job-123/checkpoints/cp-456.json",
      )
    })

    it("generates correct checkpoints prefix", () => {
      expect(strategy.getCheckpointsPrefix("job-123")).toBe("jobs/job-123/checkpoints/")
    })

    it("generates correct run setting key", () => {
      expect(strategy.getRunSettingKey("job-123", "run-789")).toBe(
        "jobs/job-123/runs/run-789/run-setting.json",
      )
    })

    it("generates correct event key", () => {
      expect(strategy.getEventKey("job-123", "run-789", 1234567890, 5, "startRun")).toBe(
        "jobs/job-123/runs/run-789/event-1234567890-5-startRun.json",
      )
    })

    it("generates correct events prefix", () => {
      expect(strategy.getEventsPrefix("job-123", "run-789")).toBe("jobs/job-123/runs/run-789/")
    })

    it("generates correct jobs prefix", () => {
      expect(strategy.getJobsPrefix()).toBe("jobs/")
    })
  })

  describe("with prefix", () => {
    const strategy = createKeyStrategy("perstack/")

    it("generates correct job key with prefix", () => {
      expect(strategy.getJobKey("job-123")).toBe("perstack/jobs/job-123/job.json")
    })

    it("generates correct checkpoint key with prefix", () => {
      expect(strategy.getCheckpointKey("job-123", "cp-456")).toBe(
        "perstack/jobs/job-123/checkpoints/cp-456.json",
      )
    })
  })

  describe("with prefix without trailing slash", () => {
    const strategy = createKeyStrategy("perstack")

    it("normalizes prefix to include trailing slash", () => {
      expect(strategy.getJobKey("job-123")).toBe("perstack/jobs/job-123/job.json")
    })
  })

  describe("parseEventKey", () => {
    const strategy = createKeyStrategy("")

    it("parses valid event key", () => {
      const result = strategy.parseEventKey(
        "jobs/job-123/runs/run-789/event-1234567890-5-startRun.json",
      )
      expect(result).toEqual({
        timestamp: 1234567890,
        stepNumber: 5,
        type: "startRun",
      })
    })

    it("parses event key with hyphenated type", () => {
      const result = strategy.parseEventKey(
        "jobs/job-123/runs/run-789/event-1234567890-5-call-delegate.json",
      )
      expect(result).toEqual({
        timestamp: 1234567890,
        stepNumber: 5,
        type: "call-delegate",
      })
    })

    it("returns null for non-event key", () => {
      expect(strategy.parseEventKey("jobs/job-123/job.json")).toBeNull()
    })

    it("returns null for run-setting key", () => {
      expect(strategy.parseEventKey("jobs/job-123/runs/run-789/run-setting.json")).toBeNull()
    })

    it("returns null for malformed event key", () => {
      expect(strategy.parseEventKey("jobs/job-123/runs/run-789/event-invalid.json")).toBeNull()
    })
  })
})
