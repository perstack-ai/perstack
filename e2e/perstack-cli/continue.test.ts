import { describe, expect, it } from "vitest"
import { assertEventSequenceContains } from "../lib/assertions.js"
import { filterEventsByType, getEventSequence } from "../lib/event-parser.js"
import { runCli, withEventParsing } from "../lib/runner.js"

const CONTINUE_CONFIG = "./e2e/experts/continue-resume.toml"
const PARALLEL_CONFIG = "./e2e/experts/parallel-delegate.toml"
// LLM API calls require extended timeout beyond the default 30s
const LLM_TIMEOUT = 180000

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
  /**
   * Test: Continue and complete job from interactive tool stop
   *
   * Flow:
   * 1. Run e2e-continue expert with a test query
   * 2. Expert calls askUser (interactive tool) and execution stops
   * 3. Continue the job with --continue-job and -i flag, providing user input
   * 4. Expert receives input, summarizes, and calls attemptCompletion
   *
   * TOML (continue-resume.toml):
   * - e2e-continue expert is instructed to call askUser for confirmation
   * - askUser is defined as interactiveSkill, which stops execution
   * - Has @perstack/base skill with attemptCompletion tool
   *
   * Expected:
   * - Initial run emits exactly 1 stopRunByInteractiveTool event and returns jobId
   * - Continue run starts with initialCheckpoint.status === "stoppedByInteractiveTool"
   * - Continue run emits exactly 1 completeRun event
   */
  it("should continue and complete job from interactive stop", async () => {
    const initialCmdResult = await runCli(
      runArgs("e2e-continue", "Test continue/resume functionality"),
      { timeout: LLM_TIMEOUT },
    )
    const initialResult = withEventParsing(initialCmdResult)
    expect(initialResult.jobId).not.toBeNull()
    const initialStopEvents = filterEventsByType(initialResult.events, "stopRunByInteractiveTool")
    expect(initialStopEvents.length).toBe(1)

    const continueCmdResult = await runCli(
      continueArgs(initialResult.jobId!, "e2e-continue", "User confirmed the test", true),
      { timeout: LLM_TIMEOUT },
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
    const completeEvents = filterEventsByType(continueResult.events, "completeRun")
    expect(completeEvents.length).toBe(1)
  })

  /**
   * Test: Continue conversation after parallel delegation
   *
   * Flow:
   * 1. Run e2e-parallel-delegate with "Test parallel delegation" query
   * 2. Expert delegates to both e2e-delegate-math and e2e-delegate-text in parallel
   * 3. Sub-experts return "Math result: 5" and "Text result: olleh"
   * 4. Parent expert summarizes and completes (initial run finishes)
   * 5. Continue same job with new query "summarize the previous results"
   * 6. Expert uses conversation context to respond
   *
   * TOML (parallel-delegate.toml):
   * - e2e-parallel-delegate: delegates to math and text experts simultaneously
   * - e2e-delegate-math: calculates "2 + 3"
   * - e2e-delegate-text: reverses "hello"
   *
   * Expected:
   * - Initial run emits 1 callDelegate event with 2 toolCalls (parallel delegation)
   * - Initial run emits 3 completeRun events (coordinator + 2 delegates)
   * - Continue run emits exactly 1 completeRun event (coordinator only, no delegation)
   * - Final completeRun has text response
   */
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
      { timeout: LLM_TIMEOUT },
    )
    const initialResult = withEventParsing(initialCmdResult)
    expect(initialResult.jobId).not.toBeNull()
    const delegateEvents = filterEventsByType(initialResult.events, "callDelegate")
    expect(delegateEvents.length).toBe(1)
    const delegateToolCalls = delegateEvents.flatMap(
      (e) => (e as { toolCalls?: unknown[] }).toolCalls ?? [],
    )
    expect(delegateToolCalls.length).toBe(2)
    const initialCompleteCount = getEventSequence(initialResult.events).filter(
      (e) => e === "completeRun",
    ).length
    expect(initialCompleteCount).toBe(3)

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
        "Complete with OK",
      ],
      { timeout: LLM_TIMEOUT },
    )
    const continueResult = withEventParsing(continueCmdResult)
    expect(
      assertEventSequenceContains(continueResult.events, ["startRun", "completeRun"]).passed,
    ).toBe(true)
    const continueCompleteEvents = continueResult.events.filter((e) => e.type === "completeRun")
    expect(continueCompleteEvents.length).toBe(1)
    const lastCompleteEvent = continueCompleteEvents[continueCompleteEvents.length - 1]
    expect((lastCompleteEvent as { text?: string }).text).toBeDefined()
  })

  /**
   * Test: Checkpoint ID is captured when stopped by interactive tool
   *
   * Flow:
   * 1. Run e2e-continue expert → stops at askUser
   * 2. Extract stopRunByInteractiveTool event
   * 3. Verify checkpoint.id exists in the event
   *
   * TOML (continue-resume.toml):
   * - e2e-continue calls askUser which triggers interactive stop
   * - System emits checkpoint with unique ID for resume-from functionality
   *
   * Expected:
   * - Exactly 1 stopRunByInteractiveTool event is emitted
   * - Event contains checkpoint.id as a string
   */
  it("should capture checkpoint ID for resume-from", async () => {
    const cmdResult = await runCli(runArgs("e2e-continue", "Test continue/resume functionality"), {
      timeout: LLM_TIMEOUT,
    })
    const result = withEventParsing(cmdResult)
    const stopEvents = filterEventsByType(result.events, "stopRunByInteractiveTool")
    expect(stopEvents.length).toBe(1)
    const checkpoint = (stopEvents[0] as { checkpoint?: { id?: string } }).checkpoint
    expect(checkpoint?.id).toBeDefined()
    expect(typeof checkpoint?.id).toBe("string")
  })

  /**
   * Test: --resume-from requires --continue-job
   *
   * Flow:
   * 1. Run with --resume-from but without --continue-job
   *
   * TOML (continue-resume.toml):
   * - Not relevant for this validation test
   *
   * Expected:
   * - Exit code 1
   * - stderr contains "--resume-from requires --continue-job"
   */
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
