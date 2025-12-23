import { describe, expect, it } from "vitest"
import {
  applyFilters,
  evaluateCondition,
  parseFilterExpression,
  parseStepFilter,
} from "./filter.js"
import type { FilterCondition, FilterOptions } from "./types.js"

describe("parseStepFilter", () => {
  it("parses exact step number", () => {
    const result = parseStepFilter("5")
    expect(result).toEqual({ type: "exact", value: 5 })
  })

  it("parses greater than", () => {
    const result = parseStepFilter(">5")
    expect(result).toEqual({ type: "gt", value: 5 })
  })

  it("parses greater than or equal", () => {
    const result = parseStepFilter(">=5")
    expect(result).toEqual({ type: "gte", value: 5 })
  })

  it("parses less than", () => {
    const result = parseStepFilter("<10")
    expect(result).toEqual({ type: "lt", value: 10 })
  })

  it("parses less than or equal", () => {
    const result = parseStepFilter("<=10")
    expect(result).toEqual({ type: "lte", value: 10 })
  })

  it("parses range", () => {
    const result = parseStepFilter("1-10")
    expect(result).toEqual({ type: "range", min: 1, max: 10 })
  })

  it("throws on invalid format", () => {
    expect(() => parseStepFilter("abc")).toThrow("Invalid step filter")
  })
})

describe("parseFilterExpression", () => {
  it("parses equality with string value", () => {
    const result = parseFilterExpression('.type == "completeRun"')
    expect(result).toEqual({
      field: ["type"],
      operator: "==",
      value: "completeRun",
    })
  })

  it("parses equality with number value", () => {
    const result = parseFilterExpression(".stepNumber == 5")
    expect(result).toEqual({
      field: ["stepNumber"],
      operator: "==",
      value: 5,
    })
  })

  it("parses greater than", () => {
    const result = parseFilterExpression(".stepNumber > 5")
    expect(result).toEqual({
      field: ["stepNumber"],
      operator: ">",
      value: 5,
    })
  })

  it("parses greater than or equal", () => {
    const result = parseFilterExpression(".stepNumber >= 5")
    expect(result).toEqual({
      field: ["stepNumber"],
      operator: ">=",
      value: 5,
    })
  })

  it("parses less than", () => {
    const result = parseFilterExpression(".stepNumber < 10")
    expect(result).toEqual({
      field: ["stepNumber"],
      operator: "<",
      value: 10,
    })
  })

  it("parses less than or equal", () => {
    const result = parseFilterExpression(".stepNumber <= 10")
    expect(result).toEqual({
      field: ["stepNumber"],
      operator: "<=",
      value: 10,
    })
  })

  it("parses inequality", () => {
    const result = parseFilterExpression('.type != "startRun"')
    expect(result).toEqual({
      field: ["type"],
      operator: "!=",
      value: "startRun",
    })
  })

  it("parses nested field path", () => {
    const result = parseFilterExpression('.error.name == "APIError"')
    expect(result).toEqual({
      field: ["error", "name"],
      operator: "==",
      value: "APIError",
    })
  })

  it("parses array wildcard", () => {
    const result = parseFilterExpression('.toolCalls[].skillName == "base"')
    expect(result).toEqual({
      field: ["toolCalls", "*", "skillName"],
      operator: "==",
      value: "base",
    })
  })

  it("throws on invalid expression", () => {
    expect(() => parseFilterExpression("invalid")).toThrow("Invalid filter expression")
  })
})

describe("evaluateCondition", () => {
  const baseEvent = {
    id: "event-1",
    type: "callTools" as const,
    timestamp: 1234567890,
    jobId: "job-1",
    runId: "run-1",
    stepNumber: 5,
    expertKey: "test-expert",
    newMessage: {
      id: "msg-1",
      type: "expertMessage" as const,
      contents: [],
    },
    toolCalls: [
      { id: "tc-1", skillName: "base", toolName: "read_file", args: {} },
      { id: "tc-2", skillName: "custom", toolName: "write_file", args: {} },
    ],
    usage: {
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
      cachedInputTokens: 0,
      reasoningTokens: 0,
    },
  }

  it("evaluates simple field equality", () => {
    const condition: FilterCondition = { field: ["type"], operator: "==", value: "callTools" }
    expect(evaluateCondition(baseEvent, condition)).toBe(true)
  })

  it("evaluates simple field inequality", () => {
    const condition: FilterCondition = { field: ["type"], operator: "!=", value: "startRun" }
    expect(evaluateCondition(baseEvent, condition)).toBe(true)
  })

  it("evaluates numeric greater than", () => {
    const condition: FilterCondition = { field: ["stepNumber"], operator: ">", value: 3 }
    expect(evaluateCondition(baseEvent, condition)).toBe(true)
  })

  it("evaluates numeric greater than (false)", () => {
    const condition: FilterCondition = { field: ["stepNumber"], operator: ">", value: 5 }
    expect(evaluateCondition(baseEvent, condition)).toBe(false)
  })

  it("evaluates numeric less than", () => {
    const condition: FilterCondition = { field: ["stepNumber"], operator: "<", value: 10 }
    expect(evaluateCondition(baseEvent, condition)).toBe(true)
  })

  it("evaluates array wildcard field", () => {
    const condition: FilterCondition = {
      field: ["toolCalls", "*", "skillName"],
      operator: "==",
      value: "base",
    }
    expect(evaluateCondition(baseEvent, condition)).toBe(true)
  })

  it("evaluates array wildcard field (not found)", () => {
    const condition: FilterCondition = {
      field: ["toolCalls", "*", "skillName"],
      operator: "==",
      value: "nonexistent",
    }
    expect(evaluateCondition(baseEvent, condition)).toBe(false)
  })

  it("returns false for non-existent field", () => {
    const condition: FilterCondition = { field: ["nonexistent"], operator: "==", value: "test" }
    expect(evaluateCondition(baseEvent, condition)).toBe(false)
  })
})

describe("applyFilters", () => {
  const events = [
    {
      id: "e1",
      type: "startRun" as const,
      timestamp: 1000,
      jobId: "job-1",
      runId: "run-1",
      stepNumber: 1,
      expertKey: "test-expert",
      initialCheckpoint: {} as never,
      inputMessages: [],
    },
    {
      id: "e2",
      type: "callTools" as const,
      timestamp: 2000,
      jobId: "job-1",
      runId: "run-1",
      stepNumber: 2,
      expertKey: "test-expert",
      newMessage: { id: "msg-1", type: "expertMessage" as const, contents: [] },
      toolCalls: [{ id: "tc-1", skillName: "base", toolName: "read_file", args: {} }],
      usage: {
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        cachedInputTokens: 0,
        reasoningTokens: 0,
      },
    },
    {
      id: "e3",
      type: "resolveToolResults" as const,
      timestamp: 3000,
      jobId: "job-1",
      runId: "run-1",
      stepNumber: 2,
      expertKey: "test-expert",
      toolResults: [{ id: "tc-1", skillName: "base", toolName: "read_file", result: [] }],
    },
    {
      id: "e4",
      type: "stopRunByError" as const,
      timestamp: 4000,
      jobId: "job-1",
      runId: "run-1",
      stepNumber: 3,
      expertKey: "test-expert",
      checkpoint: {} as never,
      step: {} as never,
      error: { name: "APIError", message: "Rate limit exceeded", isRetryable: true },
    },
    {
      id: "e5",
      type: "callDelegate" as const,
      timestamp: 5000,
      jobId: "job-1",
      runId: "run-1",
      stepNumber: 4,
      expertKey: "test-expert",
      newMessage: { id: "msg-2", type: "expertMessage" as const, contents: [] },
      toolCalls: [{ id: "tc-2", skillName: "delegate", toolName: "call_expert", args: {} }],
      usage: {
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        cachedInputTokens: 0,
        reasoningTokens: 0,
      },
    },
  ]

  it("filters by exact step", () => {
    const options: FilterOptions = { step: { type: "exact", value: 2 } }
    const result = applyFilters(events, options)
    expect(result.events.map((e) => e.id)).toEqual(["e2", "e3"])
  })

  it("filters by step greater than", () => {
    const options: FilterOptions = { step: { type: "gt", value: 2 } }
    const result = applyFilters(events, options)
    expect(result.events.map((e) => e.id)).toEqual(["e4", "e5"])
  })

  it("filters by step range", () => {
    const options: FilterOptions = { step: { type: "range", min: 2, max: 3 } }
    const result = applyFilters(events, options)
    expect(result.events.map((e) => e.id)).toEqual(["e2", "e3", "e4"])
  })

  it("filters by event type", () => {
    const options: FilterOptions = { type: "callTools" }
    const result = applyFilters(events, options)
    expect(result.events.map((e) => e.id)).toEqual(["e2"])
  })

  it("filters errors preset", () => {
    const options: FilterOptions = { errors: true }
    const result = applyFilters(events, options)
    expect(result.events.map((e) => e.id)).toEqual(["e4"])
  })

  it("filters tools preset", () => {
    const options: FilterOptions = { tools: true }
    const result = applyFilters(events, options)
    expect(result.events.map((e) => e.id)).toEqual(["e2", "e3"])
  })

  it("filters delegations preset", () => {
    const options: FilterOptions = { delegations: true }
    const result = applyFilters(events, options)
    expect(result.events.map((e) => e.id)).toEqual(["e5"])
  })

  it("applies take", () => {
    const options: FilterOptions = { take: 2 }
    const result = applyFilters(events, options)
    expect(result.events.map((e) => e.id)).toEqual(["e1", "e2"])
    expect(result.totalBeforePagination).toBe(5)
  })

  it("applies offset", () => {
    const options: FilterOptions = { offset: 2 }
    const result = applyFilters(events, options)
    expect(result.events.map((e) => e.id)).toEqual(["e3", "e4", "e5"])
    expect(result.totalBeforePagination).toBe(5)
  })

  it("applies take and offset together", () => {
    const options: FilterOptions = { take: 2, offset: 1 }
    const result = applyFilters(events, options)
    expect(result.events.map((e) => e.id)).toEqual(["e2", "e3"])
    expect(result.totalBeforePagination).toBe(5)
  })

  it("combines multiple filters (AND logic)", () => {
    const options: FilterOptions = {
      step: { type: "gte", value: 2 },
      tools: true,
    }
    const result = applyFilters(events, options)
    expect(result.events.map((e) => e.id)).toEqual(["e2", "e3"])
  })

  it("applies filter expression", () => {
    const options: FilterOptions = {
      filterExpression: { field: ["stepNumber"], operator: ">", value: 2 },
    }
    const result = applyFilters(events, options)
    expect(result.events.map((e) => e.id)).toEqual(["e4", "e5"])
  })

  it("adds context events", () => {
    const options: FilterOptions = { errors: true, context: 1 }
    const result = applyFilters(events, options)
    expect(result.events.map((e) => e.id)).toEqual(["e3", "e4", "e5"])
  })
})
