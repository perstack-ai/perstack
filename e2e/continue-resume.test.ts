import { describe, expect, it } from "vitest"
import { assertEventSequenceContains } from "./lib/assertions.js"
import { filterEventsByType, getEventSequence } from "./lib/event-parser.js"
import { runExpert } from "./lib/runner.js"

const CONTINUE_EXPERT = "e2e-continue"
const RESUME_EXPERT = "e2e-resume"
const QUERY = "Test continue/resume functionality"
const USER_RESPONSE = "User confirmed the test"

describe("Continue and Resume From Checkpoint", () => {
  it("should stop at interactive tool and get run ID", async () => {
    const result = await runExpert(CONTINUE_EXPERT, QUERY, {
      configPath: "./e2e/experts/continue-resume.toml",
      timeout: 180000,
    })
    const sequenceResult = assertEventSequenceContains(result.events, [
      "startRun",
      "callInteractiveTool",
      "stopRunByInteractiveTool",
    ])
    expect(sequenceResult.passed).toBe(true)
    expect(result.runId).not.toBeNull()
  }, 200000)

  it("should continue run with --continue-run", async () => {
    const initialResult = await runExpert(CONTINUE_EXPERT, QUERY, {
      configPath: "./e2e/experts/continue-resume.toml",
      timeout: 180000,
    })
    expect(initialResult.runId).not.toBeNull()
    const continueResult = await runExpert(CONTINUE_EXPERT, USER_RESPONSE, {
      configPath: "./e2e/experts/continue-resume.toml",
      continueRunId: initialResult.runId!,
      isInteractiveResult: true,
      timeout: 180000,
    })
    const sequenceResult = assertEventSequenceContains(continueResult.events, ["startRun"])
    expect(sequenceResult.passed).toBe(true)
    const hasCorrectStatus = continueResult.events.some(
      (e) =>
        e.type === "startRun" &&
        (e as { initialCheckpoint?: { status?: string } }).initialCheckpoint?.status ===
          "stoppedByInteractiveTool",
    )
    expect(hasCorrectStatus).toBe(true)
  }, 400000)

  it("should complete after continue", async () => {
    const initialResult = await runExpert(CONTINUE_EXPERT, QUERY, {
      configPath: "./e2e/experts/continue-resume.toml",
      timeout: 180000,
    })
    expect(initialResult.runId).not.toBeNull()
    const continueResult = await runExpert(CONTINUE_EXPERT, USER_RESPONSE, {
      configPath: "./e2e/experts/continue-resume.toml",
      continueRunId: initialResult.runId!,
      isInteractiveResult: true,
      timeout: 180000,
    })
    const sequence = getEventSequence(continueResult.events)
    expect(sequence).toContain("completeRun")
  }, 400000)

  it("should capture checkpoint for resume", async () => {
    const initialResult = await runExpert(RESUME_EXPERT, QUERY, {
      configPath: "./e2e/experts/continue-resume.toml",
      timeout: 180000,
    })
    const stopEvent = filterEventsByType(initialResult.events, "stopRunByInteractiveTool")[0]
    expect(stopEvent).toBeDefined()
    const checkpoint = (stopEvent as { checkpoint?: { id?: string } }).checkpoint
    expect(checkpoint?.id).toBeDefined()
    expect(initialResult.runId).not.toBeNull()
  }, 200000)
})

