import { describe, expect, it } from "vitest"
import { assertEventSequenceContains } from "../lib/assertions.js"
import { runRuntimeCli, withEventParsing } from "../lib/runner.js"

describe("Interactive Input", () => {
  describe("Ask user for input", () => {
    it("should stop at interactive tool and emit checkpoint", async () => {
      const cmdResult = await runRuntimeCli(
        ["run", "--config", "./e2e/experts/continue-resume.toml", "e2e-continue", "Test continue/resume functionality"],
        { timeout: 180000 },
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
    }, 200000)
  })
})
