import { describe, expect, it } from "vitest"
import { assertEventSequenceContains, assertToolCallCount } from "../lib/assertions.js"
import { filterEventsByType } from "../lib/event-parser.js"
import { runRuntimeCli, withEventParsing } from "../lib/runner.js"

describe.concurrent("Run Expert", () => {
  it("should answer a simple question and complete", async () => {
    const cmdResult = await runRuntimeCli(
      ["run", "--config", "./e2e/experts/global-runtime.toml", "e2e-global-runtime", "Say hello"],
      { timeout: 120000 },
    )
    const result = withEventParsing(cmdResult)
    expect(result.exitCode).toBe(0)
    expect(assertEventSequenceContains(result.events, ["startRun", "completeRun"]).passed).toBe(
      true,
    )
    const completeEvent = result.events.find((e) => e.type === "completeRun")
    expect(completeEvent).toBeDefined()
    expect((completeEvent as { text?: string }).text?.length).toBeGreaterThan(0)
  }, 180000)

  it("should execute multiple tools in parallel and complete", async () => {
    const cmdResult = await runRuntimeCli(
      ["run", "--config", "./e2e/experts/special-tools.toml", "e2e-special-tools", "echo test"],
      { timeout: 180000 },
    )
    const result = withEventParsing(cmdResult)

    expect(assertToolCallCount(result.events, "callTools", 4).passed).toBe(true)
    expect(
      assertEventSequenceContains(result.events, ["startRun", "callTools", "resolveToolResults"])
        .passed,
    ).toBe(true)

    const resolveEvents = filterEventsByType(result.events, "resolveToolResults")

    const hasThinkResult = resolveEvents.some((e) => {
      const toolResults = (e as { toolResults?: { toolName: string }[] }).toolResults ?? []
      return toolResults.some((tr) => tr.toolName === "think")
    })
    expect(hasThinkResult).toBe(true)

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
  }, 200000)

  it("should read and summarize PDF content", async () => {
    const cmdResult = await runRuntimeCli(
      [
        "run",
        "--config",
        "./e2e/experts/multi-modal.toml",
        "e2e-pdf-reader",
        "Read and summarize the PDF at e2e/fixtures/test.pdf",
      ],
      { timeout: 180000 },
    )
    const result = withEventParsing(cmdResult)
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
    const cmdResult = await runRuntimeCli(
      [
        "run",
        "--config",
        "./e2e/experts/multi-modal.toml",
        "e2e-image-reader",
        "Read and describe the image at e2e/fixtures/test.gif",
      ],
      { timeout: 180000 },
    )
    const result = withEventParsing(cmdResult)
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
