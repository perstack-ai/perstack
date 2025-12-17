import { describe, expect, it } from "vitest"
import { assertEventSequenceContains } from "../lib/assertions.js"
import { filterEventsByType, getEventSequence } from "../lib/event-parser.js"
import { runCli, withEventParsing } from "../lib/runner.js"

describe("Continue Job", () => {
  describe("Continue from interactive stop", () => {
    it("should continue job with --continue-job", async () => {
      const initialCmdResult = await runCli(
        [
          "run",
          "--config",
          "./e2e/experts/continue-resume.toml",
          "--runtime",
          "local",
          "e2e-continue",
          "Test continue/resume functionality",
        ],
        { timeout: 180000 },
      )
      const initialResult = withEventParsing(initialCmdResult)
      expect(initialResult.jobId).not.toBeNull()

      const continueCmdResult = await runCli(
        [
          "run",
          "--config",
          "./e2e/experts/continue-resume.toml",
          "--runtime",
          "local",
          "--continue-job",
          initialResult.jobId!,
          "-i",
          "e2e-continue",
          "User confirmed the test",
        ],
        { timeout: 180000 },
      )
      const continueResult = withEventParsing(continueCmdResult)
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
      const initialCmdResult = await runCli(
        [
          "run",
          "--config",
          "./e2e/experts/continue-resume.toml",
          "--runtime",
          "local",
          "e2e-continue",
          "Test continue/resume functionality",
        ],
        { timeout: 180000 },
      )
      const initialResult = withEventParsing(initialCmdResult)
      expect(initialResult.jobId).not.toBeNull()

      const continueCmdResult = await runCli(
        [
          "run",
          "--config",
          "./e2e/experts/continue-resume.toml",
          "--runtime",
          "local",
          "--continue-job",
          initialResult.jobId!,
          "-i",
          "e2e-continue",
          "User confirmed the test",
        ],
        { timeout: 180000 },
      )
      const continueResult = withEventParsing(continueCmdResult)
      expect(getEventSequence(continueResult.events)).toContain("completeRun")
    }, 400000)
  })

  describe("Continue from delegation stop", () => {
    it("should continue after parallel delegation and complete", async () => {
      const initialCmdResult = await runCli(
        [
          "run",
          "--config",
          "./e2e/experts/parallel-delegate.toml",
          "--runtime",
          "local",
          "e2e-parallel-delegate",
          "Test parallel delegation: call both math and text experts simultaneously",
        ],
        { timeout: 180000 },
      )
      const initialResult = withEventParsing(initialCmdResult)
      expect(initialResult.jobId).not.toBeNull()
      const initialCompleteCount = getEventSequence(initialResult.events).filter(
        (e) => e === "completeRun",
      ).length
      expect(initialCompleteCount).toBeGreaterThanOrEqual(1)

      const continueCmdResult = await runCli(
        [
          "run",
          "--config",
          "./e2e/experts/parallel-delegate.toml",
          "--runtime",
          "local",
          "--continue-job",
          initialResult.jobId!,
          "e2e-parallel-delegate",
          "Now summarize the previous results in one sentence",
        ],
        { timeout: 180000 },
      )
      const continueResult = withEventParsing(continueCmdResult)
      expect(
        assertEventSequenceContains(continueResult.events, ["startRun", "completeRun"]).passed,
      ).toBe(true)
      const continueCompleteEvents = continueResult.events.filter((e) => e.type === "completeRun")
      expect(continueCompleteEvents.length).toBeGreaterThanOrEqual(1)
      const lastCompleteEvent = continueCompleteEvents[continueCompleteEvents.length - 1]
      expect((lastCompleteEvent as { text?: string }).text).toBeDefined()
    }, 400000)
  })

  describe("Resume from checkpoint", () => {
    it("should capture checkpoint ID for resume-from", async () => {
      const cmdResult = await runCli(
        [
          "run",
          "--config",
          "./e2e/experts/continue-resume.toml",
          "--runtime",
          "local",
          "e2e-continue",
          "Test continue/resume functionality",
        ],
        { timeout: 180000 },
      )
      const result = withEventParsing(cmdResult)
      const stopEvents = filterEventsByType(result.events, "stopRunByInteractiveTool")
      expect(stopEvents.length).toBeGreaterThan(0)
      const checkpoint = (stopEvents[0] as { checkpoint?: { id?: string } }).checkpoint
      expect(checkpoint?.id).toBeDefined()
      expect(typeof checkpoint?.id).toBe("string")
    }, 200000)

    it("should fail when --resume-from is used without --continue-job", async () => {
      const result = await runCli([
        "run",
        "--config",
        "./e2e/experts/continue-resume.toml",
        "--runtime",
        "local",
        "--resume-from",
        "checkpoint-123",
        "e2e-continue",
        "test",
      ])
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain("--resume-from requires --continue-job")
    }, 60000)
  })
})
