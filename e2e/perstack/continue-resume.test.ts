import { describe, expect, it } from "vitest"
import { assertEventSequenceContains } from "../lib/assertions.js"
import { filterEventsByType, getEventSequence } from "../lib/event-parser.js"
import { runExpert } from "../lib/runner.js"

const CONFIG_PATH = "./e2e/experts/continue-resume.toml"
const TIMEOUT = 180000

describe("Continue and Resume From Checkpoint", () => {
  it("should stop at interactive tool and get job ID", async () => {
    const result = await runExpert("e2e-continue", "Test continue/resume functionality", {
      configPath: CONFIG_PATH,
      timeout: TIMEOUT,
    })
    expect(
      assertEventSequenceContains(result.events, [
        "startRun",
        "callInteractiveTool",
        "stopRunByInteractiveTool",
      ]).passed,
    ).toBe(true)
    expect(result.jobId).not.toBeNull()
  }, 200000)

  it("should continue job with --continue-job", async () => {
    const initialResult = await runExpert("e2e-continue", "Test continue/resume functionality", {
      configPath: CONFIG_PATH,
      timeout: TIMEOUT,
    })
    expect(initialResult.jobId).not.toBeNull()
    const continueResult = await runExpert("e2e-continue", "User confirmed the test", {
      configPath: CONFIG_PATH,
      continueJobId: initialResult.jobId!,
      isInteractiveResult: true,
      timeout: TIMEOUT,
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
      configPath: CONFIG_PATH,
      timeout: TIMEOUT,
    })
    expect(initialResult.jobId).not.toBeNull()
    const continueResult = await runExpert("e2e-continue", "User confirmed the test", {
      configPath: CONFIG_PATH,
      continueJobId: initialResult.jobId!,
      isInteractiveResult: true,
      timeout: TIMEOUT,
    })
    expect(getEventSequence(continueResult.events)).toContain("completeRun")
  }, 400000)

  it("should capture checkpoint for resume", async () => {
    const result = await runExpert("e2e-resume", "Test continue/resume functionality", {
      configPath: CONFIG_PATH,
      timeout: TIMEOUT,
    })
    const stopEvent = filterEventsByType(result.events, "stopRunByInteractiveTool")[0]
    expect(stopEvent).toBeDefined()
    expect((stopEvent as { checkpoint?: { id?: string } }).checkpoint?.id).toBeDefined()
    expect(result.jobId).not.toBeNull()
  }, 200000)
})
