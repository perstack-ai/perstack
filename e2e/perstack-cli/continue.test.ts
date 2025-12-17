import { describe, expect, it } from "vitest"
import { assertEventSequenceContains } from "../lib/assertions.js"
import { filterEventsByType, getEventSequence } from "../lib/event-parser.js"
import { runCli, withEventParsing } from "../lib/runner.js"

const CONTINUE_CONFIG = "./e2e/experts/continue-resume.toml"
const PARALLEL_CONFIG = "./e2e/experts/parallel-delegate.toml"
// LLM API calls require extended timeout beyond the default 30s
const TIMEOUT = 180000

function runArgs(expertKey: string, query: string): string[] {
  return ["run", "--config", CONTINUE_CONFIG, "--runtime", "local", expertKey, query]
}

function continueArgs(
  jobId: string,
  expertKey: string,
  query: string,
  interactive = false,
): string[] {
  const args = ["run", "--config", CONTINUE_CONFIG, "--runtime", "local", "--continue-job", jobId]
  if (interactive) {
    args.push("-i")
  }
  args.push(expertKey, query)
  return args
}

describe.concurrent("Continue Job", () => {
  it("should continue job with --continue-job from interactive stop", async () => {
    const initialCmdResult = await runCli(
      runArgs("e2e-continue", "Test continue/resume functionality"),
      { timeout: TIMEOUT },
    )
    const initialResult = withEventParsing(initialCmdResult)
    expect(initialResult.jobId).not.toBeNull()

    const continueCmdResult = await runCli(
      continueArgs(initialResult.jobId!, "e2e-continue", "User confirmed the test", true),
      { timeout: TIMEOUT },
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
  })

  it("should complete after continue from interactive stop", async () => {
    const initialCmdResult = await runCli(
      runArgs("e2e-continue", "Test continue/resume functionality"),
      { timeout: TIMEOUT },
    )
    const initialResult = withEventParsing(initialCmdResult)
    expect(initialResult.jobId).not.toBeNull()

    const continueCmdResult = await runCli(
      continueArgs(initialResult.jobId!, "e2e-continue", "User confirmed the test", true),
      { timeout: TIMEOUT },
    )
    const continueResult = withEventParsing(continueCmdResult)
    expect(getEventSequence(continueResult.events)).toContain("completeRun")
  })

  it("should continue after parallel delegation and complete", async () => {
    const initialCmdResult = await runCli(
      [
        "run",
        "--config",
        PARALLEL_CONFIG,
        "--runtime",
        "local",
        "e2e-parallel-delegate",
        "Test parallel delegation: call both math and text experts simultaneously",
      ],
      { timeout: TIMEOUT },
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
        PARALLEL_CONFIG,
        "--runtime",
        "local",
        "--continue-job",
        initialResult.jobId!,
        "e2e-parallel-delegate",
        "Now summarize the previous results in one sentence",
      ],
      { timeout: TIMEOUT },
    )
    const continueResult = withEventParsing(continueCmdResult)
    expect(
      assertEventSequenceContains(continueResult.events, ["startRun", "completeRun"]).passed,
    ).toBe(true)
    const continueCompleteEvents = continueResult.events.filter((e) => e.type === "completeRun")
    expect(continueCompleteEvents.length).toBeGreaterThanOrEqual(1)
    const lastCompleteEvent = continueCompleteEvents[continueCompleteEvents.length - 1]
    expect((lastCompleteEvent as { text?: string }).text).toBeDefined()
  })

  it("should capture checkpoint ID for resume-from", async () => {
    const cmdResult = await runCli(runArgs("e2e-continue", "Test continue/resume functionality"), {
      timeout: TIMEOUT,
    })
    const result = withEventParsing(cmdResult)
    const stopEvents = filterEventsByType(result.events, "stopRunByInteractiveTool")
    expect(stopEvents.length).toBeGreaterThan(0)
    const checkpoint = (stopEvents[0] as { checkpoint?: { id?: string } }).checkpoint
    expect(checkpoint?.id).toBeDefined()
    expect(typeof checkpoint?.id).toBe("string")
  })

  it("should fail when --resume-from is used without --continue-job", async () => {
    const result = await runCli([
      "run",
      "--config",
      CONTINUE_CONFIG,
      "--runtime",
      "local",
      "--resume-from",
      "checkpoint-123",
      "e2e-continue",
      "test",
    ])
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain("--resume-from requires --continue-job")
  })
})
