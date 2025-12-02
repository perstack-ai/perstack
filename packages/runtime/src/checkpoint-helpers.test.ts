import type { Checkpoint, RunSetting } from "@perstack/core"
import { describe, expect, it } from "vitest"
import {
  buildDelegateToState,
  buildDelegationReturnState,
  createInitialCheckpoint,
  createNextStepCheckpoint,
} from "./checkpoint-helpers.js"

describe("@perstack/runtime: createInitialCheckpoint", () => {
  it("creates checkpoint with correct initial values", () => {
    const result = createInitialCheckpoint("checkpoint-id", {
      runId: "run-123",
      expertKey: "expert-key",
      expert: { name: "test-expert", version: "1.0.0" },
      contextWindow: 100000,
    })
    expect(result).toEqual({
      id: "checkpoint-id",
      runId: "run-123",
      expert: {
        key: "expert-key",
        name: "test-expert",
        version: "1.0.0",
      },
      stepNumber: 1,
      status: "init",
      messages: [],
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        reasoningTokens: 0,
        totalTokens: 0,
        cachedInputTokens: 0,
      },
      contextWindow: 100000,
      contextWindowUsage: 0.0,
    })
  })

  it("sets contextWindowUsage to undefined when contextWindow is undefined", () => {
    const result = createInitialCheckpoint("checkpoint-id", {
      runId: "run-123",
      expertKey: "expert-key",
      expert: { name: "test-expert", version: "1.0.0" },
      contextWindow: undefined,
    })
    expect(result.contextWindow).toBeUndefined()
    expect(result.contextWindowUsage).toBeUndefined()
  })
})

describe("@perstack/runtime: createNextStepCheckpoint", () => {
  const baseCheckpoint: Checkpoint = {
    id: "old-id",
    runId: "run-123",
    expert: { key: "expert-key", name: "test-expert", version: "1.0.0" },
    stepNumber: 5,
    status: "proceeding",
    messages: [
      { id: "m1", type: "userMessage", contents: [{ id: "c1", type: "textPart", text: "hello" }] },
    ],
    usage: {
      inputTokens: 100,
      outputTokens: 50,
      reasoningTokens: 0,
      totalTokens: 150,
      cachedInputTokens: 0,
    },
    contextWindow: 100000,
    contextWindowUsage: 0.5,
  }

  it("increments stepNumber and updates id", () => {
    const result = createNextStepCheckpoint("new-checkpoint-id", baseCheckpoint)
    expect(result.id).toBe("new-checkpoint-id")
    expect(result.stepNumber).toBe(6)
  })

  it("preserves other checkpoint properties", () => {
    const result = createNextStepCheckpoint("new-checkpoint-id", baseCheckpoint)
    expect(result.runId).toBe(baseCheckpoint.runId)
    expect(result.expert).toEqual(baseCheckpoint.expert)
    expect(result.status).toBe(baseCheckpoint.status)
    expect(result.messages).toEqual(baseCheckpoint.messages)
    expect(result.usage).toEqual(baseCheckpoint.usage)
  })
})

describe("@perstack/runtime: buildDelegationReturnState", () => {
  const baseSetting = {
    runId: "run-123",
    model: "claude-sonnet-4-20250514",
    providerConfig: { providerName: "anthropic" as const, apiKey: "test-key" },
    expertKey: "child-expert",
    input: { text: "child query" },
    experts: {},
    temperature: 0.7,
    maxRetries: 3,
    timeout: 30000,
    startedAt: 1000,
    updatedAt: 2000,
    perstackApiBaseUrl: "https://api.perstack.dev",
    env: {},
  } satisfies RunSetting
  const parentCheckpoint: Checkpoint = {
    id: "parent-checkpoint-id",
    runId: "run-123",
    expert: { key: "parent-expert", name: "parent", version: "1.0.0" },
    stepNumber: 3,
    status: "proceeding",
    messages: [],
    usage: {
      inputTokens: 50,
      outputTokens: 25,
      reasoningTokens: 0,
      totalTokens: 75,
      cachedInputTokens: 0,
    },
  }
  const resultCheckpoint: Checkpoint = {
    id: "child-checkpoint-id",
    runId: "run-123",
    expert: { key: "child-expert", name: "child", version: "1.0.0" },
    stepNumber: 5,
    status: "completed",
    messages: [
      {
        id: "m1",
        type: "expertMessage",
        contents: [{ id: "c1", type: "textPart", text: "delegation result" }],
      },
    ],
    usage: {
      inputTokens: 200,
      outputTokens: 100,
      reasoningTokens: 0,
      totalTokens: 300,
      cachedInputTokens: 0,
    },
    delegatedBy: {
      expert: { key: "parent-expert", name: "parent", version: "1.0.0" },
      toolCallId: "tool-call-123",
      toolName: "delegateTool",
      checkpointId: "parent-checkpoint-id",
    },
  }

  it("builds correct setting with interactiveToolCallResult", () => {
    const result = buildDelegationReturnState(baseSetting, resultCheckpoint, parentCheckpoint)
    expect(result.setting.expertKey).toBe("parent-expert")
    expect(result.setting.input).toEqual({
      interactiveToolCallResult: {
        toolCallId: "tool-call-123",
        toolName: "delegateTool",
        text: "delegation result",
      },
    })
  })

  it("builds checkpoint with parent data and updated stepNumber/usage", () => {
    const result = buildDelegationReturnState(baseSetting, resultCheckpoint, parentCheckpoint)
    expect(result.checkpoint.id).toBe("parent-checkpoint-id")
    expect(result.checkpoint.stepNumber).toBe(5)
    expect(result.checkpoint.usage).toEqual(resultCheckpoint.usage)
  })

  it("throws when delegatedBy is missing", () => {
    const checkpointWithoutDelegatedBy = { ...resultCheckpoint, delegatedBy: undefined }
    expect(() =>
      buildDelegationReturnState(baseSetting, checkpointWithoutDelegatedBy, parentCheckpoint),
    ).toThrow("delegatedBy is required")
  })

  it("throws when last message is not expertMessage", () => {
    const checkpointWithWrongMessage: Checkpoint = {
      ...resultCheckpoint,
      messages: [
        {
          id: "m1",
          type: "userMessage",
          contents: [{ id: "c1", type: "textPart", text: "wrong" }],
        },
      ],
    }
    expect(() =>
      buildDelegationReturnState(baseSetting, checkpointWithWrongMessage, parentCheckpoint),
    ).toThrow("delegation result message is incorrect")
  })

  it("throws when expertMessage has no text content", () => {
    const checkpointWithNoText: Checkpoint = {
      ...resultCheckpoint,
      messages: [
        {
          id: "m1",
          type: "expertMessage",
          contents: [
            { id: "c1", type: "toolCallPart", toolCallId: "tc1", toolName: "tool", args: {} },
          ],
        },
      ],
    }
    expect(() =>
      buildDelegationReturnState(baseSetting, checkpointWithNoText, parentCheckpoint),
    ).toThrow("does not contain a text")
  })
})

describe("@perstack/runtime: buildDelegateToState", () => {
  const baseSetting = {
    runId: "run-123",
    model: "claude-sonnet-4-20250514",
    providerConfig: { providerName: "anthropic" as const, apiKey: "test-key" },
    expertKey: "parent-expert",
    input: { text: "parent query" },
    experts: {},
    temperature: 0.7,
    maxRetries: 3,
    timeout: 30000,
    startedAt: 1000,
    updatedAt: 2000,
    perstackApiBaseUrl: "https://api.perstack.dev",
    env: {},
  } satisfies RunSetting
  const resultCheckpoint: Checkpoint = {
    id: "parent-checkpoint-id",
    runId: "run-123",
    expert: { key: "parent-expert", name: "parent", version: "1.0.0" },
    stepNumber: 3,
    status: "stoppedByDelegate",
    messages: [
      { id: "m1", type: "userMessage", contents: [{ id: "c1", type: "textPart", text: "hello" }] },
    ],
    usage: {
      inputTokens: 100,
      outputTokens: 50,
      reasoningTokens: 0,
      totalTokens: 150,
      cachedInputTokens: 0,
    },
    delegateTo: {
      expert: { key: "child-expert", name: "child", version: "2.0.0" },
      toolCallId: "tool-call-456",
      toolName: "delegateToChild",
      query: "please do this",
    },
  }
  const currentExpert = { key: "parent-expert", name: "parent", version: "1.0.0" }

  it("builds correct setting for delegate target", () => {
    const result = buildDelegateToState(baseSetting, resultCheckpoint, currentExpert)
    expect(result.setting.expertKey).toBe("child-expert")
    expect(result.setting.input).toEqual({ text: "please do this" })
  })

  it("builds checkpoint with delegate target expert and delegatedBy", () => {
    const result = buildDelegateToState(baseSetting, resultCheckpoint, currentExpert)
    expect(result.checkpoint.status).toBe("init")
    expect(result.checkpoint.messages).toEqual([])
    expect(result.checkpoint.expert).toEqual({
      key: "child-expert",
      name: "child",
      version: "2.0.0",
    })
    expect(result.checkpoint.delegatedBy).toEqual({
      expert: { key: "parent-expert", name: "parent", version: "1.0.0" },
      toolCallId: "tool-call-456",
      toolName: "delegateToChild",
      checkpointId: "parent-checkpoint-id",
    })
  })

  it("preserves usage from result checkpoint", () => {
    const result = buildDelegateToState(baseSetting, resultCheckpoint, currentExpert)
    expect(result.checkpoint.usage).toEqual(resultCheckpoint.usage)
  })

  it("throws when delegateTo is missing", () => {
    const checkpointWithoutDelegateTo = { ...resultCheckpoint, delegateTo: undefined }
    expect(() =>
      buildDelegateToState(baseSetting, checkpointWithoutDelegateTo, currentExpert),
    ).toThrow("delegateTo is required")
  })
})
