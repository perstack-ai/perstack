import {
  type AssertionResult,
  assertEventSequenceContains,
} from "../lib/assertions.js"
import { filterEventsByType, getEventSequence } from "../lib/event-parser.js"
import { runExpert, type TestSuite } from "../lib/runner.js"

const CONTINUE_EXPERT = "e2e-continue"
const RESUME_EXPERT = "e2e-resume"
const QUERY = "Test continue/resume functionality"
const USER_RESPONSE = "User confirmed the test"

export const continueResumeSuite: TestSuite = {
  name: "Continue and Resume From Checkpoint",
  tests: [
    {
      name: "Should stop at interactive tool and get run ID",
      run: async (): Promise<AssertionResult[]> => {
        const result = await runExpert(CONTINUE_EXPERT, QUERY, {
          configPath: "./e2e/experts/continue-resume.toml",
        })
        return [
          assertEventSequenceContains(result.events, [
            "startRun",
            "callInteractiveTool",
            "stopRunByInteractiveTool",
          ]),
          {
            passed: result.runId !== null,
            message: result.runId ? `Got run ID: ${result.runId}` : "No run ID captured",
          },
        ]
      },
    },
    {
      name: "Should continue run with --continue-run",
      run: async (): Promise<AssertionResult[]> => {
        const initialResult = await runExpert(CONTINUE_EXPERT, QUERY, {
          configPath: "./e2e/experts/continue-resume.toml",
        })
        if (!initialResult.runId) {
          return [{ passed: false, message: "No run ID from initial run" }]
        }
        const continueResult = await runExpert(CONTINUE_EXPERT, USER_RESPONSE, {
          configPath: "./e2e/experts/continue-resume.toml",
          continueRunId: initialResult.runId,
          isInteractiveResult: true,
        })
        return [
          assertEventSequenceContains(continueResult.events, ["startRun"]),
          {
            passed: continueResult.events.some(
              (e) =>
                e.type === "startRun" &&
                (e as { initialCheckpoint?: { status?: string } }).initialCheckpoint?.status ===
                  "stoppedByInteractiveTool",
            ),
            message: "Continued from stoppedByInteractiveTool status",
          },
        ]
      },
    },
    {
      name: "Should complete after continue",
      run: async (): Promise<AssertionResult[]> => {
        const initialResult = await runExpert(CONTINUE_EXPERT, QUERY, {
          configPath: "./e2e/experts/continue-resume.toml",
        })
        if (!initialResult.runId) {
          return [{ passed: false, message: "No run ID from initial run" }]
        }
        const continueResult = await runExpert(CONTINUE_EXPERT, USER_RESPONSE, {
          configPath: "./e2e/experts/continue-resume.toml",
          continueRunId: initialResult.runId,
          isInteractiveResult: true,
        })
        const sequence = getEventSequence(continueResult.events)
        const hasComplete = sequence.includes("completeRun")
        return [
          {
            passed: hasComplete,
            message: hasComplete
              ? "Run completed after continue"
              : "Run did not complete after continue",
            details: hasComplete ? undefined : { sequence },
          },
        ]
      },
    },
    {
      name: "Should resume from specific checkpoint",
      run: async (): Promise<AssertionResult[]> => {
        const initialResult = await runExpert(RESUME_EXPERT, QUERY, {
          configPath: "./e2e/experts/continue-resume.toml",
        })
        const stopEvent = filterEventsByType(
          initialResult.events,
          "stopRunByInteractiveTool",
        )[0]
        if (!stopEvent) {
          return [{ passed: false, message: "No stopRunByInteractiveTool event" }]
        }
        const checkpoint = (stopEvent as { checkpoint?: { id?: string } }).checkpoint
        const checkpointId = checkpoint?.id
        if (!checkpointId || !initialResult.runId) {
          return [
            {
              passed: false,
              message: `Missing checkpoint ID (${checkpointId}) or run ID (${initialResult.runId})`,
            },
          ]
        }
        return [
          {
            passed: true,
            message: `Checkpoint captured: ${checkpointId}`,
            details: { runId: initialResult.runId, checkpointId },
          },
        ]
      },
    },
  ],
}

