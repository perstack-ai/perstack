/**
 * Run Expert E2E Tests (Runtime)
 *
 * Tests core expert execution in perstack-runtime:
 * - Simple question answering
 * - Multi-tool parallel execution
 * - PDF reading and summarization
 * - Image reading and description
 *
 * TOML: e2e/experts/global-runtime.toml, special-tools.toml, multi-modal.toml
 */
import { describe, expect, it } from "vitest"
import { assertEventSequenceContains, assertToolCallCount } from "../lib/assertions.js"
import { filterEventsByType } from "../lib/event-parser.js"
import { runRuntimeCli, withEventParsing } from "../lib/runner.js"

const GLOBAL_RUNTIME_CONFIG = "./e2e/experts/global-runtime.toml"
const SPECIAL_TOOLS_CONFIG = "./e2e/experts/special-tools.toml"
const MULTI_MODAL_CONFIG = "./e2e/experts/multi-modal.toml"
// LLM API calls require extended timeout
const LLM_TIMEOUT = 120000
const LLM_EXTENDED_TIMEOUT = 180000

describe.concurrent("Run Expert", () => {
  /** Verifies simple query completes with text response. */
  it(
    "should answer a simple question and complete",
    async () => {
      const cmdResult = await runRuntimeCli(
        ["run", "--config", GLOBAL_RUNTIME_CONFIG, "e2e-global-runtime", "Say hello"],
        { timeout: LLM_TIMEOUT },
      )
      const result = withEventParsing(cmdResult)
      expect(result.exitCode).toBe(0)
      expect(assertEventSequenceContains(result.events, ["startRun", "completeRun"]).passed).toBe(
        true,
      )
      const completeEvent = result.events.find((e) => e.type === "completeRun")
      expect(completeEvent).toBeDefined()
      expect((completeEvent as { text?: string }).text?.length).toBeGreaterThan(0)
    },
    LLM_TIMEOUT,
  )

  /** Verifies 3 tools execute in parallel (PDF, image, search). */
  it(
    "should execute multiple tools in parallel and complete",
    async () => {
      const cmdResult = await runRuntimeCli(
        ["run", "--config", SPECIAL_TOOLS_CONFIG, "e2e-special-tools", "echo test"],
        { timeout: LLM_EXTENDED_TIMEOUT },
      )
      const result = withEventParsing(cmdResult)
      expect(assertToolCallCount(result.events, "callTools", 3).passed).toBe(true)
      expect(
        assertEventSequenceContains(result.events, ["startRun", "callTools", "resolveToolResults"])
          .passed,
      ).toBe(true)
      const resolveEvents = filterEventsByType(result.events, "resolveToolResults")
      const hasPdfResult = resolveEvents.some((e) => {
        const toolResults = (e as { toolResults?: { toolName: string }[] }).toolResults ?? []
        return toolResults.some((tr) => tr.toolName === "readPdfFile")
      })
      expect(hasPdfResult).toBe(true)
      const hasImageResult = resolveEvents.some((e) => {
        const toolResults = (e as { toolResults?: { toolName: string }[] }).toolResults ?? []
        return toolResults.some((tr) => tr.toolName === "readImageFile")
      })
      expect(hasImageResult).toBe(true)
      const hasSearchResult = resolveEvents.some((e) => {
        const toolResults = (e as { toolResults?: { toolName: string }[] }).toolResults ?? []
        return toolResults.some((tr) => tr.toolName === "web_search_exa")
      })
      expect(hasSearchResult).toBe(true)
      expect(assertEventSequenceContains(result.events, ["completeRun"]).passed).toBe(true)
      expect(result.exitCode).toBe(0)
    },
    LLM_EXTENDED_TIMEOUT,
  )

  /** Verifies PDF file reading and content extraction. */
  it(
    "should read and summarize PDF content",
    async () => {
      const cmdResult = await runRuntimeCli(
        [
          "run",
          "--config",
          MULTI_MODAL_CONFIG,
          "e2e-pdf-reader",
          "Read and summarize the PDF at e2e/fixtures/test.pdf",
        ],
        { timeout: LLM_EXTENDED_TIMEOUT },
      )
      const result = withEventParsing(cmdResult)
      expect(result.exitCode).toBe(0)
      expect(
        assertEventSequenceContains(result.events, ["startRun", "callTools", "completeRun"]).passed,
      ).toBe(true)
      const completeEvent = result.events.find((e) => e.type === "completeRun")
      const text = completeEvent && "text" in completeEvent ? (completeEvent.text as string) : ""
      expect(
        text.toLowerCase().includes("perstack") ||
          text.toLowerCase().includes("github") ||
          text.toLowerCase().includes("repository"),
      ).toBe(true)
    },
    LLM_EXTENDED_TIMEOUT,
  )

  /** Verifies image file reading and visual description. */
  it(
    "should read and describe image content",
    async () => {
      const cmdResult = await runRuntimeCli(
        [
          "run",
          "--config",
          MULTI_MODAL_CONFIG,
          "e2e-image-reader",
          "Read and describe the image at e2e/fixtures/test.gif",
        ],
        { timeout: LLM_EXTENDED_TIMEOUT },
      )
      const result = withEventParsing(cmdResult)
      expect(result.exitCode).toBe(0)
      expect(
        assertEventSequenceContains(result.events, ["startRun", "callTools", "completeRun"]).passed,
      ).toBe(true)
      const completeEvent = result.events.find((e) => e.type === "completeRun")
      const text = completeEvent && "text" in completeEvent ? (completeEvent.text as string) : ""
      expect(
        text.toLowerCase().includes("perstack") ||
          text.toLowerCase().includes("demo") ||
          text.toLowerCase().includes("terminal") ||
          text.toLowerCase().includes("cli") ||
          text.toLowerCase().includes("interface"),
      ).toBe(true)
    },
    LLM_EXTENDED_TIMEOUT,
  )
})
