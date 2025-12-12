import { describe, expect, it } from "vitest"
import { assertEventSequenceContains } from "../lib/assertions.js"
import { getEventSequence } from "../lib/event-parser.js"
import { runExpert } from "../lib/runner.js"

describe("Continue Job", () => {
  describe("Continue from interactive stop", () => {
    it("should continue job with --continue-job", async () => {
      const initialResult = await runExpert("e2e-continue", "Test continue/resume functionality", {
        configPath: "./e2e/experts/continue-resume.toml",
        timeout: 180000,
      })
      expect(initialResult.jobId).not.toBeNull()
      const continueResult = await runExpert("e2e-continue", "User confirmed the test", {
        configPath: "./e2e/experts/continue-resume.toml",
        continueJobId: initialResult.jobId!,
        isInteractiveResult: true,
        timeout: 180000,
      })
      expect(assertEventSequenceContains(continueResult.events, ["startRun"]).passed).toBe(true)
      expect(
        continueResult.events.some(
          (e) =>
            e.type === "startRun" &&
            (e as { initialCheckpoint?: { status?: string } }).initialCheckpoint?.status ===
              "stoppedByInteractiveTool",
        ),
      ).toBe(true)
    }, 400000)

    it("should complete after continue", async () => {
      const initialResult = await runExpert("e2e-continue", "Test continue/resume functionality", {
        configPath: "./e2e/experts/continue-resume.toml",
        timeout: 180000,
      })
      expect(initialResult.jobId).not.toBeNull()
      const continueResult = await runExpert("e2e-continue", "User confirmed the test", {
        configPath: "./e2e/experts/continue-resume.toml",
        continueJobId: initialResult.jobId!,
        isInteractiveResult: true,
        timeout: 180000,
      })
      expect(getEventSequence(continueResult.events)).toContain("completeRun")
    }, 400000)
  })

  describe("Continue from delegation stop", () => {
    it("should continue after parallel delegation and complete", async () => {
      const initialResult = await runExpert(
        "e2e-parallel-delegate",
        "Test parallel delegation: call both math and text experts simultaneously",
        { configPath: "./e2e/experts/parallel-delegate.toml", timeout: 180000 },
      )
      expect(initialResult.jobId).not.toBeNull()
      const initialCompleteCount = getEventSequence(initialResult.events).filter(
        (e) => e === "completeRun",
      ).length
      expect(initialCompleteCount).toBeGreaterThanOrEqual(1)
      const continueResult = await runExpert(
        "e2e-parallel-delegate",
        "Now summarize the previous results in one sentence",
        {
          configPath: "./e2e/experts/parallel-delegate.toml",
          continueJobId: initialResult.jobId!,
          timeout: 180000,
        },
      )
      expect(
        assertEventSequenceContains(continueResult.events, ["startRun", "completeRun"]).passed,
      ).toBe(true)
      const continueCompleteEvents = continueResult.events.filter((e) => e.type === "completeRun")
      expect(continueCompleteEvents.length).toBeGreaterThanOrEqual(1)
      const lastCompleteEvent = continueCompleteEvents[continueCompleteEvents.length - 1]
      expect((lastCompleteEvent as { text?: string }).text).toBeDefined()
    }, 400000)
  })
})
