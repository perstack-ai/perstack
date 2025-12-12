import { beforeAll, describe, expect, it } from "vitest"
import { assertEventSequenceContains, assertToolCallCount } from "../lib/assertions.js"
import { filterEventsByType } from "../lib/event-parser.js"
import { type RunResult, runExpertWithRuntimeCli } from "../lib/runner.js"

describe("Run Expert", () => {
  describe("Answer a question", () => {
    it("should answer a simple question and complete", async () => {
      const result = await runExpertWithRuntimeCli("e2e-global-runtime", "Say hello", {
        configPath: "./e2e/experts/global-runtime.toml",
        timeout: 120000,
      })
      expect(result.exitCode).toBe(0)
      expect(assertEventSequenceContains(result.events, ["startRun", "completeRun"]).passed).toBe(
        true,
      )
      const completeEvent = result.events.find((e) => e.type === "completeRun")
      expect(completeEvent).toBeDefined()
      expect((completeEvent as { text?: string }).text?.length).toBeGreaterThan(0)
    }, 180000)
  })

  describe("Use tools", () => {
    let result: RunResult

    beforeAll(async () => {
      result = await runExpertWithRuntimeCli("e2e-special-tools", "echo test", {
        configPath: "./e2e/experts/special-tools.toml",
        timeout: 180000,
      })
    }, 200000)

    it("should execute multiple tools in parallel", () => {
      expect(assertToolCallCount(result.events, "callTools", 4).passed).toBe(true)
      expect(
        assertEventSequenceContains(result.events, ["startRun", "callTools", "resolveToolResults"])
          .passed,
      ).toBe(true)
    })

    it("should use think tool", () => {
      const resolveEvents = filterEventsByType(result.events, "resolveToolResults")
      const hasThinkResult = resolveEvents.some((e) => {
        const toolResults = (e as { toolResults?: { toolName: string }[] }).toolResults ?? []
        return toolResults.some((tr) => tr.toolName === "think")
      })
      expect(hasThinkResult).toBe(true)
    })

    it("should read PDF file", () => {
      const resolveEvents = filterEventsByType(result.events, "resolveToolResults")
      const hasPdfResult = resolveEvents.some((e) => {
        const toolResults = (e as { toolResults?: { toolName: string }[] }).toolResults ?? []
        return toolResults.some((tr) => tr.toolName === "readPdfFile")
      })
      expect(hasPdfResult).toBe(true)
    })

    it("should read image file", () => {
      const resolveEvents = filterEventsByType(result.events, "resolveToolResults")
      const hasImageResult = resolveEvents.some((e) => {
        const toolResults = (e as { toolResults?: { toolName: string }[] }).toolResults ?? []
        return toolResults.some((tr) => tr.toolName === "readImageFile")
      })
      expect(hasImageResult).toBe(true)
    })

    it("should search the web", () => {
      const resolveEvents = filterEventsByType(result.events, "resolveToolResults")
      const hasSearchResult = resolveEvents.some((e) => {
        const toolResults = (e as { toolResults?: { toolName: string }[] }).toolResults ?? []
        return toolResults.some((tr) => tr.toolName === "web_search_exa")
      })
      expect(hasSearchResult).toBe(true)
    })

    it("should complete run successfully", () => {
      expect(assertEventSequenceContains(result.events, ["completeRun"]).passed).toBe(true)
      expect(result.exitCode).toBe(0)
    })
  })

  describe("Read multi-modal content", () => {
    it("should read and summarize PDF content", async () => {
      const result = await runExpertWithRuntimeCli(
        "e2e-pdf-reader",
        "Read and summarize the PDF at e2e/fixtures/test.pdf",
        { configPath: "./e2e/experts/multi-modal.toml", timeout: 180000 },
      )
      expect(result.exitCode).toBe(0)
      expect(
        assertEventSequenceContains(result.events, ["startRun", "callTools", "completeRun"]).passed,
      ).toBe(true)
      const completeEvent = result.events.find((e) => e.type === "completeRun")
      const text = completeEvent && "text" in completeEvent ? (completeEvent.text as string) : ""
      console.log("\n=== PDF Summary ===\n", text, "\n=== END ===\n")
      expect(
        text.toLowerCase().includes("perstack") ||
          text.toLowerCase().includes("github") ||
          text.toLowerCase().includes("repository"),
      ).toBe(true)
    }, 200000)

    it("should read and describe image content", async () => {
      const result = await runExpertWithRuntimeCli(
        "e2e-image-reader",
        "Read and describe the image at e2e/fixtures/test.gif",
        { configPath: "./e2e/experts/multi-modal.toml", timeout: 180000 },
      )
      expect(result.exitCode).toBe(0)
      expect(
        assertEventSequenceContains(result.events, ["startRun", "callTools", "completeRun"]).passed,
      ).toBe(true)
      const completeEvent = result.events.find((e) => e.type === "completeRun")
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
