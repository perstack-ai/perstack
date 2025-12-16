import { describe, expect, it } from "vitest"
import { findTerminalEvent, isTerminalEvent, parseContainerEvent } from "./event-parser.js"

describe("parseContainerEvent", () => {
  it("should parse valid JSON event", () => {
    const event = parseContainerEvent('{"type": "startRun", "jobId": "123"}')
    expect(event).toEqual({ type: "startRun", jobId: "123" })
  })

  it("should return null for empty string", () => {
    expect(parseContainerEvent("")).toBeNull()
  })

  it("should return null for whitespace-only string", () => {
    expect(parseContainerEvent("   ")).toBeNull()
  })

  it("should return null for invalid JSON", () => {
    expect(parseContainerEvent("not json")).toBeNull()
  })

  it("should trim whitespace before parsing", () => {
    const event = parseContainerEvent('  {"type": "test"}  ')
    expect(event).toEqual({ type: "test" })
  })
})

describe("isTerminalEvent", () => {
  it.each([
    { type: "completeRun" },
    { type: "stopRunByInteractiveTool" },
    { type: "stopRunByDelegate" },
    { type: "stopRunByExceededMaxSteps" },
  ])("should return true for $type", (event) => {
    expect(isTerminalEvent(event as never)).toBe(true)
  })

  it.each([
    { type: "startRun" },
    { type: "step" },
    { type: "unknown" },
  ])("should return false for $type", (event) => {
    expect(isTerminalEvent(event as never)).toBe(false)
  })
})

describe("findTerminalEvent", () => {
  it("should find terminal event with checkpoint", () => {
    const events = [
      { type: "startRun" },
      { type: "completeRun", checkpoint: { id: "123" } },
    ] as never[]
    const result = findTerminalEvent(events)
    expect(result?.type).toBe("completeRun")
  })

  it("should return undefined when no terminal event exists", () => {
    const events = [{ type: "startRun" }, { type: "step" }] as never[]
    expect(findTerminalEvent(events)).toBeUndefined()
  })

  it("should return undefined for empty array", () => {
    expect(findTerminalEvent([])).toBeUndefined()
  })
})
