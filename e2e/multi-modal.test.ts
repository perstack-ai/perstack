import { describe, expect, it } from "vitest"
import { assertEventSequenceContains } from "./lib/assertions.js"
import { runExpert } from "./lib/runner.js"

describe("Multi-Modal File Reading", () => {
  describe("PDF Reading", () => {
    it("should read and summarize PDF content about perstack github", async () => {
      const result = await runExpert(
        "e2e-pdf-reader",
        "Read and summarize the PDF at e2e/fixtures/test.pdf",
        {
          configPath: "./e2e/experts/multi-modal.toml",
          timeout: 180000,
        },
      )
      expect(result.exitCode).toBe(0)
      expect(
        assertEventSequenceContains(result.events, ["startRun", "callTools", "completeRun"]).passed,
      ).toBe(true)
      const completeEvent = result.events.find((e) => e.type === "completeRun")
      expect(completeEvent).toBeDefined()
      const text = completeEvent && "text" in completeEvent ? (completeEvent.text as string) : ""
      console.log("\n=== PDF Summary ===\n", text, "\n=== END ===\n")
      expect(
        text.toLowerCase().includes("perstack") ||
          text.toLowerCase().includes("github") ||
          text.toLowerCase().includes("repository"),
      ).toBe(true)
    }, 200000)
  })

  describe("Image Reading", () => {
    it("should read and describe image content about perstack demo", async () => {
      const result = await runExpert(
        "e2e-image-reader",
        "Read and describe the image at e2e/fixtures/test.gif",
        {
          configPath: "./e2e/experts/multi-modal.toml",
          timeout: 180000,
        },
      )
      expect(result.exitCode).toBe(0)
      expect(
        assertEventSequenceContains(result.events, ["startRun", "callTools", "completeRun"]).passed,
      ).toBe(true)
      const completeEvent = result.events.find((e) => e.type === "completeRun")
      expect(completeEvent).toBeDefined()
      const text = completeEvent && "text" in completeEvent ? (completeEvent.text as string) : ""
      console.log("\n=== Image Description ===\n", text, "\n=== END ===\n")
      expect(
        text.toLowerCase().includes("perstack") ||
          text.toLowerCase().includes("demo") ||
          text.toLowerCase().includes("terminal") ||
          text.toLowerCase().includes("cli") ||
          text.toLowerCase().includes("interface"),
      ).toBe(true)
    }, 200000)
  })
})
