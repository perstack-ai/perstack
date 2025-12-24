import type { Checkpoint, Job, RunEvent } from "@perstack/core"
import { describe, expect, it } from "vitest"
import { createSummary, formatJson, formatTerminal } from "./formatter.js"
import type { LogOutput } from "./types.js"

const mockJob: Job = {
  id: "job-1",
  status: "completed",
  coordinatorExpertKey: "test-expert@1.0.0",
  totalSteps: 5,
  usage: {
    inputTokens: 1000,
    outputTokens: 500,
    totalTokens: 1500,
    cachedInputTokens: 0,
    reasoningTokens: 0,
  },
  startedAt: 1700000000000,
  finishedAt: 1700001000000,
}

const mockCheckpoint: Checkpoint = {
  id: "cp-1",
  jobId: "job-1",
  runId: "run-1",
  status: "completed",
  stepNumber: 5,
  messages: [
    {
      id: "msg-1",
      type: "userMessage",
      contents: [{ id: "tp-1", type: "textPart", text: "Hello" }],
    },
    {
      id: "msg-2",
      type: "expertMessage",
      contents: [{ id: "tp-2", type: "textPart", text: "Hi there!" }],
    },
  ],
  expert: { key: "test-expert@1.0.0", name: "test-expert", version: "1.0.0" },
  usage: {
    inputTokens: 1000,
    outputTokens: 500,
    totalTokens: 1500,
    cachedInputTokens: 0,
    reasoningTokens: 0,
  },
  action: { type: "attemptCompletion", result: "Hi there!" },
}

const mockEvents: RunEvent[] = [
  {
    id: "e1",
    type: "startRun",
    timestamp: 1700000000000,
    jobId: "job-1",
    runId: "run-1",
    stepNumber: 1,
    expertKey: "test-expert@1.0.0",
    initialCheckpoint: mockCheckpoint,
    inputMessages: [
      {
        id: "msg-1",
        type: "userMessage",
        contents: [{ id: "tp-3", type: "textPart", text: "Hello" }],
      },
    ],
  },
  {
    id: "e2",
    type: "callTools",
    timestamp: 1700000100000,
    jobId: "job-1",
    runId: "run-1",
    stepNumber: 2,
    expertKey: "test-expert@1.0.0",
    newMessage: { id: "msg-2", type: "expertMessage", contents: [] },
    toolCalls: [
      { id: "tc-1", skillName: "base", toolName: "read_file", args: { path: "/test.txt" } },
      { id: "tc-2", skillName: "base", toolName: "write_file", args: { path: "/out.txt" } },
    ],
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
    type: "resolveToolResults",
    timestamp: 1700000200000,
    jobId: "job-1",
    runId: "run-1",
    stepNumber: 2,
    expertKey: "test-expert@1.0.0",
    toolResults: [
      {
        id: "tc-1",
        skillName: "base",
        toolName: "read_file",
        result: [{ id: "tp-4", type: "textPart", text: "file content" }],
      },
      {
        id: "tc-2",
        skillName: "base",
        toolName: "write_file",
        result: [{ id: "tp-5", type: "textPart", text: "Error: permission denied" }],
      },
    ],
  },
  {
    id: "e4",
    type: "stopRunByError",
    timestamp: 1700000300000,
    jobId: "job-1",
    runId: "run-1",
    stepNumber: 3,
    expertKey: "test-expert@1.0.0",
    checkpoint: mockCheckpoint,
    step: { stepNumber: 3, newMessages: [], usage: mockCheckpoint.usage, startedAt: 1700000250000 },
    error: { name: "APIError", message: "Rate limit exceeded", isRetryable: true },
  },
  {
    id: "e5",
    type: "callDelegate",
    timestamp: 1700000400000,
    jobId: "job-1",
    runId: "run-1",
    stepNumber: 4,
    expertKey: "test-expert@1.0.0",
    newMessage: { id: "msg-3", type: "expertMessage", contents: [] },
    toolCalls: [{ id: "tc-3", skillName: "delegate", toolName: "call_expert", args: {} }],
    usage: {
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
      cachedInputTokens: 0,
      reasoningTokens: 0,
    },
  },
]

describe("createSummary", () => {
  it("creates summary from events", () => {
    const summary = createSummary(mockEvents)
    expect(summary.totalEvents).toBe(5)
    expect(summary.errorCount).toBe(1)
    expect(summary.toolCallCount).toBe(2)
    expect(summary.delegationCount).toBe(1)
    expect(summary.stepRange).toEqual({ min: 1, max: 4 })
  })

  it("handles empty events", () => {
    const summary = createSummary([])
    expect(summary.totalEvents).toBe(0)
    expect(summary.errorCount).toBe(0)
    expect(summary.toolCallCount).toBe(0)
    expect(summary.delegationCount).toBe(0)
    expect(summary.stepRange).toBeUndefined()
  })
})

describe("formatJson", () => {
  it("formats output as JSON", () => {
    const output: LogOutput = {
      job: mockJob,
      events: mockEvents.slice(0, 2),
      summary: createSummary(mockEvents.slice(0, 2)),
    }
    const result = formatJson(output, {
      json: true,
      pretty: false,
      verbose: false,
      messages: false,
      summary: false,
    })
    const parsed = JSON.parse(result)
    expect(parsed.job.id).toBe("job-1")
    expect(parsed.events).toHaveLength(2)
    expect(parsed.summary.totalEvents).toBe(2)
  })

  it("formats output as pretty JSON", () => {
    const output: LogOutput = {
      job: mockJob,
      events: mockEvents.slice(0, 1),
      summary: createSummary(mockEvents.slice(0, 1)),
    }
    const result = formatJson(output, {
      json: true,
      pretty: true,
      verbose: false,
      messages: false,
      summary: false,
    })
    expect(result).toContain("\n")
    expect(result).toContain("  ")
  })
})

describe("formatTerminal", () => {
  it("formats job summary", () => {
    const output: LogOutput = {
      job: mockJob,
      events: [],
      summary: createSummary([]),
    }
    const result = formatTerminal(output, {
      json: false,
      pretty: false,
      verbose: false,
      messages: false,
      summary: true,
    })
    expect(result).toContain("job-1")
    expect(result).toContain("completed")
    expect(result).toContain("test-expert@1.0.0")
  })

  it("formats events list", () => {
    const output: LogOutput = {
      events: mockEvents,
      summary: createSummary(mockEvents),
    }
    const result = formatTerminal(output, {
      json: false,
      pretty: false,
      verbose: false,
      messages: false,
      summary: false,
    })
    expect(result).toContain("startRun")
    expect(result).toContain("callTools")
    expect(result).toContain("stopRunByError")
  })

  it("formats checkpoint with messages", () => {
    const output: LogOutput = {
      checkpoint: mockCheckpoint,
      events: [],
      summary: createSummary([]),
    }
    const result = formatTerminal(output, {
      json: false,
      pretty: false,
      verbose: false,
      messages: true,
      summary: false,
    })
    expect(result).toContain("cp-1")
    expect(result).toContain("Messages")
    expect(result).toContain("userMessage")
    expect(result).toContain("expertMessage")
  })

  it("formats verbose event details", () => {
    const output: LogOutput = {
      events: [mockEvents[1]],
      summary: createSummary([mockEvents[1]]),
    }
    const result = formatTerminal(output, {
      json: false,
      pretty: false,
      verbose: true,
      messages: false,
      summary: false,
    })
    expect(result).toContain("read_file")
    expect(result).toContain("write_file")
    expect(result).toContain("base")
  })

  it("formats error events with details", () => {
    const output: LogOutput = {
      events: [mockEvents[3]],
      summary: createSummary([mockEvents[3]]),
    }
    const result = formatTerminal(output, {
      json: false,
      pretty: false,
      verbose: false,
      messages: false,
      summary: false,
    })
    expect(result).toContain("APIError")
    expect(result).toContain("Rate limit exceeded")
  })
})
