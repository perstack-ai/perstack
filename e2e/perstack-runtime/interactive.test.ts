import { describe, expect, it } from "vitest"
import { assertEventSequenceContains } from "../lib/assertions.js"
import { runRuntimeCli, withEventParsing } from "../lib/runner.js"

const CONTINUE_CONFIG = "./e2e/experts/continue-resume.toml"
// LLM API calls require extended timeout
const LLM_TIMEOUT = 180000

describe.concurrent("Interactive Input", () => {
  it(
    "should stop at interactive tool and emit checkpoint",
    async () => {
      const cmdResult = await runRuntimeCli(
        ["run", "--config", CONTINUE_CONFIG, "e2e-continue", "Test continue/resume functionality"],
        { timeout: LLM_TIMEOUT },
      )
      const result = withEventParsing(cmdResult)
      expect(
        assertEventSequenceContains(result.events, [
          "startRun",
          "callInteractiveTool",
          "stopRunByInteractiveTool",
        ]).passed,
      ).toBe(true)
      const stopEvent = result.events.find((e) => e.type === "stopRunByInteractiveTool")
      expect(stopEvent).toBeDefined()
      expect((stopEvent as { checkpoint?: { id?: string } }).checkpoint?.id).toBeDefined()
    },
    LLM_TIMEOUT,
  )
})
