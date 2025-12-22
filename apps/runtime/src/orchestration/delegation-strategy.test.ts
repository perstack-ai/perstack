import type { Checkpoint, DelegationTarget, RunSetting, Usage } from "@perstack/core"
import { describe, expect, it, vi } from "vitest"
import {
  type DelegationContext,
  extractDelegationContext,
  ParallelDelegationStrategy,
  SingleDelegationStrategy,
  selectDelegationStrategy,
} from "./delegation-strategy.js"

const createMockUsage = (): Usage => ({
  inputTokens: 100,
  outputTokens: 50,
  reasoningTokens: 0,
  totalTokens: 150,
  cachedInputTokens: 0,
})

const createMockSetting = (overrides?: Partial<RunSetting>): RunSetting =>
  ({
    jobId: "job-1",
    runId: "run-1",
    expertKey: "expert-1",
    model: "claude-sonnet-4-20250514",
    maxSteps: 10,
    maxRetries: 3,
    timeout: 30000,
    providerConfig: { providerName: "anthropic" },
    input: { text: "test query" },
    ...overrides,
  }) as RunSetting

const createMockCheckpoint = (overrides?: Partial<Checkpoint>): Checkpoint =>
  ({
    id: "cp-1",
    jobId: "job-1",
    runId: "run-1",
    status: "stoppedByDelegate",
    stepNumber: 1,
    messages: [],
    expert: { key: "expert-1", name: "Expert 1", version: "1.0.0" },
    usage: createMockUsage(),
    contextWindow: 100000,
    ...overrides,
  }) as Checkpoint

const createMockContext = (overrides?: Partial<DelegationContext>): DelegationContext => ({
  id: "cp-1",
  stepNumber: 1,
  contextWindow: 100000,
  usage: createMockUsage(),
  messages: [],
  ...overrides,
})

const createMockDelegation = (overrides?: Partial<DelegationTarget>): DelegationTarget => ({
  expert: { key: "child-expert", name: "Child Expert", version: "1.0.0" },
  toolCallId: "tc-1",
  toolName: "delegateTo",
  query: "child query",
  ...overrides,
})

describe("@perstack/runtime: delegation-strategy", () => {
  describe("SingleDelegationStrategy", () => {
    it("throws error when delegations.length !== 1", async () => {
      const strategy = new SingleDelegationStrategy()
      const setting = createMockSetting()
      const context = createMockContext()
      const parentExpert = { key: "parent", name: "Parent", version: "1.0" }
      const runFn = vi.fn()

      await expect(strategy.execute([], setting, context, parentExpert, runFn)).rejects.toThrow(
        "SingleDelegationStrategy requires exactly one delegation",
      )

      await expect(
        strategy.execute(
          [createMockDelegation(), createMockDelegation()],
          setting,
          context,
          parentExpert,
          runFn,
        ),
      ).rejects.toThrow("SingleDelegationStrategy requires exactly one delegation")
    })

    it("builds delegation state for single delegation without executing runFn", async () => {
      const strategy = new SingleDelegationStrategy()
      const setting = createMockSetting()
      const context = createMockContext()
      const delegation = createMockDelegation()
      const parentExpert = { key: "parent", name: "Parent", version: "1.0" }
      const runFn = vi.fn()

      const result = await strategy.execute([delegation], setting, context, parentExpert, runFn)

      expect(runFn).not.toHaveBeenCalled()
      expect(result.nextSetting).toBeDefined()
      expect(result.nextCheckpoint).toBeDefined()
      expect(result.nextSetting.expertKey).toBe("child-expert")
      expect(result.nextSetting.input.text).toBe("child query")
    })

    it("uses delegations parameter directly, not checkpoint.delegateTo", async () => {
      const strategy = new SingleDelegationStrategy()
      const setting = createMockSetting()
      const context = createMockContext()
      const delegation = createMockDelegation({
        expert: { key: "correct-expert", name: "Correct", version: "1.0" },
        query: "correct query",
      })
      const parentExpert = { key: "parent", name: "Parent", version: "1.0" }
      const runFn = vi.fn()

      const result = await strategy.execute([delegation], setting, context, parentExpert, runFn)

      // Should use the delegation parameter, not any other source
      expect(result.nextSetting.expertKey).toBe("correct-expert")
      expect(result.nextSetting.input.text).toBe("correct query")
    })

    it("sets delegatedBy with parent expert info", async () => {
      const strategy = new SingleDelegationStrategy()
      const setting = createMockSetting()
      const context = createMockContext({ id: "parent-cp-id" })
      const delegation = createMockDelegation()
      const parentExpert = { key: "parent-key", name: "Parent Name", version: "2.0" }
      const runFn = vi.fn()

      const result = await strategy.execute([delegation], setting, context, parentExpert, runFn)

      expect(result.nextCheckpoint.delegatedBy).toEqual({
        expert: {
          key: "parent-key",
          name: "Parent Name",
          version: "2.0",
        },
        toolCallId: "tc-1",
        toolName: "delegateTo",
        checkpointId: "parent-cp-id",
      })
    })
  })

  describe("ParallelDelegationStrategy", () => {
    it("throws error when delegations.length < 2", async () => {
      const strategy = new ParallelDelegationStrategy()
      const setting = createMockSetting()
      const context = createMockContext()
      const parentExpert = { key: "parent", name: "Parent", version: "1.0" }
      const runFn = vi.fn()

      await expect(strategy.execute([], setting, context, parentExpert, runFn)).rejects.toThrow(
        "ParallelDelegationStrategy requires at least two delegations",
      )

      await expect(
        strategy.execute([createMockDelegation()], setting, context, parentExpert, runFn),
      ).rejects.toThrow("ParallelDelegationStrategy requires at least two delegations")
    })

    it("executes multiple delegations in parallel", async () => {
      const strategy = new ParallelDelegationStrategy()
      const setting = createMockSetting()
      const delegations = [
        createMockDelegation({
          toolCallId: "tc-1",
          expert: { key: "expert-a", name: "A", version: "1" },
        }),
        createMockDelegation({
          toolCallId: "tc-2",
          expert: { key: "expert-b", name: "B", version: "1" },
        }),
      ]
      const context = createMockContext()
      const parentExpert = { key: "parent", name: "Parent", version: "1.0" }

      const createMockResultCheckpoint = (expertKey: string, stepNumber: number): Checkpoint => ({
        ...createMockCheckpoint(),
        stepNumber,
        expert: { key: expertKey, name: expertKey, version: "1" },
        messages: [
          {
            id: `msg-${expertKey}`,
            type: "expertMessage",
            contents: [{ type: "textPart", id: "txt-1", text: `Result from ${expertKey}` }],
          },
        ],
      })

      const runFn = vi
        .fn()
        .mockResolvedValueOnce(createMockResultCheckpoint("expert-a", 3))
        .mockResolvedValueOnce(createMockResultCheckpoint("expert-b", 5))

      const result = await strategy.execute(delegations, setting, context, parentExpert, runFn)

      expect(runFn).toHaveBeenCalledTimes(2)
      expect(result.nextSetting.input.interactiveToolCallResult?.toolCallId).toBe("tc-1")
      expect(result.nextCheckpoint.stepNumber).toBe(5) // max step number
      expect(result.nextCheckpoint.partialToolResults).toHaveLength(1)
      expect(result.nextCheckpoint.partialToolResults?.[0].id).toBe("tc-2")
    })

    it("preserves delegatedBy for nested delegations", async () => {
      const strategy = new ParallelDelegationStrategy()
      const setting = createMockSetting()
      const delegations = [
        createMockDelegation({
          toolCallId: "tc-1",
          expert: { key: "expert-a", name: "A", version: "1" },
        }),
        createMockDelegation({
          toolCallId: "tc-2",
          expert: { key: "expert-b", name: "B", version: "1" },
        }),
      ]
      const parentDelegatedBy = {
        expert: { key: "grandparent", name: "Grandparent", version: "1.0" },
        toolCallId: "gp-tc-1",
        toolName: "delegateTo",
        checkpointId: "gp-cp-id",
      }
      const context = createMockContext({ delegatedBy: parentDelegatedBy })
      const parentExpert = { key: "parent", name: "Parent", version: "1.0" }

      const createMockResultCheckpoint = (expertKey: string): Checkpoint => ({
        ...createMockCheckpoint(),
        messages: [
          {
            id: `msg-${expertKey}`,
            type: "expertMessage",
            contents: [{ type: "textPart", id: "txt-1", text: `Result` }],
          },
        ],
      })

      const runFn = vi
        .fn()
        .mockResolvedValueOnce(createMockResultCheckpoint("expert-a"))
        .mockResolvedValueOnce(createMockResultCheckpoint("expert-b"))

      const result = await strategy.execute(delegations, setting, context, parentExpert, runFn)

      // Should preserve the parent's delegatedBy reference
      expect(result.nextCheckpoint.delegatedBy).toEqual(parentDelegatedBy)
    })

    it("restores parent messages after parallel delegation", async () => {
      const strategy = new ParallelDelegationStrategy()
      const setting = createMockSetting()
      const delegations = [
        createMockDelegation({
          toolCallId: "tc-1",
          expert: { key: "expert-a", name: "A", version: "1" },
        }),
        createMockDelegation({
          toolCallId: "tc-2",
          expert: { key: "expert-b", name: "B", version: "1" },
        }),
      ]
      const parentMessages = [
        { id: "msg-1", type: "userMessage" as const, contents: [] },
        {
          id: "msg-2",
          type: "expertMessage" as const,
          contents: [{ type: "textPart" as const, id: "txt-1", text: "Hello" }],
        },
      ]
      const context = createMockContext({ messages: parentMessages })
      const parentExpert = { key: "parent", name: "Parent", version: "1.0" }

      const createMockResultCheckpoint = (expertKey: string): Checkpoint => ({
        ...createMockCheckpoint(),
        messages: [
          {
            id: `msg-${expertKey}`,
            type: "expertMessage",
            contents: [{ type: "textPart", id: "txt-1", text: "Result" }],
          },
        ],
      })

      const runFn = vi
        .fn()
        .mockResolvedValueOnce(createMockResultCheckpoint("expert-a"))
        .mockResolvedValueOnce(createMockResultCheckpoint("expert-b"))

      const result = await strategy.execute(delegations, setting, context, parentExpert, runFn)

      // Should restore parent's conversation history, not empty or child messages
      expect(result.nextCheckpoint.messages).toEqual(parentMessages)
    })

    it("aggregates usage from all delegations", async () => {
      const strategy = new ParallelDelegationStrategy()
      const setting = createMockSetting()
      const delegations = [
        createMockDelegation({
          toolCallId: "tc-1",
          expert: { key: "expert-a", name: "A", version: "1" },
        }),
        createMockDelegation({
          toolCallId: "tc-2",
          expert: { key: "expert-b", name: "B", version: "1" },
        }),
      ]
      const context = createMockContext({
        usage: {
          inputTokens: 10,
          outputTokens: 5,
          reasoningTokens: 0,
          totalTokens: 15,
          cachedInputTokens: 0,
        },
      })
      const parentExpert = { key: "parent", name: "Parent", version: "1.0" }

      const createMockResultCheckpoint = (usage: Usage): Checkpoint => ({
        ...createMockCheckpoint(),
        usage,
        messages: [
          {
            id: "msg-result",
            type: "expertMessage",
            contents: [{ type: "textPart", id: "txt-1", text: "Result" }],
          },
        ],
      })

      const runFn = vi
        .fn()
        .mockResolvedValueOnce(
          createMockResultCheckpoint({
            inputTokens: 100,
            outputTokens: 50,
            reasoningTokens: 0,
            totalTokens: 150,
            cachedInputTokens: 0,
          }),
        )
        .mockResolvedValueOnce(
          createMockResultCheckpoint({
            inputTokens: 200,
            outputTokens: 100,
            reasoningTokens: 10,
            totalTokens: 300,
            cachedInputTokens: 5,
          }),
        )

      const result = await strategy.execute(delegations, setting, context, parentExpert, runFn)

      // Original: 10+5+0+15+0, plus two delegations
      expect(result.nextCheckpoint.usage.inputTokens).toBe(310) // 10 + 100 + 200
      expect(result.nextCheckpoint.usage.outputTokens).toBe(155) // 5 + 50 + 100
      expect(result.nextCheckpoint.usage.reasoningTokens).toBe(10) // 0 + 0 + 10
    })

    it("throws error if delegation result has no expertMessage", async () => {
      const strategy = new ParallelDelegationStrategy()
      const setting = createMockSetting()
      const delegations = [
        createMockDelegation({ toolCallId: "tc-1" }),
        createMockDelegation({ toolCallId: "tc-2" }),
      ]
      const context = createMockContext()
      const parentExpert = { key: "parent", name: "Parent", version: "1.0" }

      const runFn = vi.fn().mockResolvedValue({
        ...createMockCheckpoint(),
        messages: [{ id: "msg-1", type: "userMessage", contents: [] }],
      })

      await expect(
        strategy.execute(delegations, setting, context, parentExpert, runFn),
      ).rejects.toThrow("Delegation error: delegation result message is incorrect")
    })

    it("throws error if delegation result has no text part", async () => {
      const strategy = new ParallelDelegationStrategy()
      const setting = createMockSetting()
      const delegations = [
        createMockDelegation({ toolCallId: "tc-1" }),
        createMockDelegation({ toolCallId: "tc-2" }),
      ]
      const context = createMockContext()
      const parentExpert = { key: "parent", name: "Parent", version: "1.0" }

      const runFn = vi.fn().mockResolvedValue({
        ...createMockCheckpoint(),
        messages: [
          { id: "msg-1", type: "expertMessage", contents: [{ type: "imagePart", id: "img-1" }] },
        ],
      })

      await expect(
        strategy.execute(delegations, setting, context, parentExpert, runFn),
      ).rejects.toThrow("Delegation error: delegation result message does not contain text")
    })

    it("passes parent options to child runs", async () => {
      const strategy = new ParallelDelegationStrategy()
      const setting = createMockSetting()
      const delegations = [
        createMockDelegation({
          toolCallId: "tc-1",
          expert: { key: "expert-a", name: "A", version: "1" },
        }),
        createMockDelegation({
          toolCallId: "tc-2",
          expert: { key: "expert-b", name: "B", version: "1" },
        }),
      ]
      const context = createMockContext()
      const parentExpert = { key: "parent", name: "Parent", version: "1.0" }

      const createMockResultCheckpoint = (expertKey: string): Checkpoint => ({
        ...createMockCheckpoint(),
        messages: [
          {
            id: `msg-${expertKey}`,
            type: "expertMessage",
            contents: [{ type: "textPart", id: "txt-1", text: `Result` }],
          },
        ],
      })

      const runFn = vi
        .fn()
        .mockResolvedValueOnce(createMockResultCheckpoint("expert-a"))
        .mockResolvedValueOnce(createMockResultCheckpoint("expert-b"))

      const storeCheckpoint = vi.fn()
      const eventListener = vi.fn()
      const parentOptions = {
        storeCheckpoint,
        eventListener,
      }

      await strategy.execute(delegations, setting, context, parentExpert, runFn, parentOptions)

      // Verify runFn was called with merged options (parent options + returnOnDelegationComplete)
      expect(runFn).toHaveBeenCalledTimes(2)
      const firstCallOptions = runFn.mock.calls[0][1]
      const secondCallOptions = runFn.mock.calls[1][1]

      expect(firstCallOptions).toEqual({
        storeCheckpoint,
        eventListener,
        returnOnDelegationComplete: true,
      })
      expect(secondCallOptions).toEqual({
        storeCheckpoint,
        eventListener,
        returnOnDelegationComplete: true,
      })
    })
  })

  describe("selectDelegationStrategy()", () => {
    it("returns SingleDelegationStrategy for count = 1", () => {
      const strategy = selectDelegationStrategy(1)
      expect(strategy).toBeInstanceOf(SingleDelegationStrategy)
    })

    it("returns ParallelDelegationStrategy for count > 1", () => {
      expect(selectDelegationStrategy(2)).toBeInstanceOf(ParallelDelegationStrategy)
      expect(selectDelegationStrategy(5)).toBeInstanceOf(ParallelDelegationStrategy)
      expect(selectDelegationStrategy(100)).toBeInstanceOf(ParallelDelegationStrategy)
    })

    it("returns ParallelDelegationStrategy for count = 0 (edge case)", () => {
      const strategy = selectDelegationStrategy(0)
      expect(strategy).toBeInstanceOf(ParallelDelegationStrategy)
    })
  })

  describe("extractDelegationContext()", () => {
    it("extracts only required fields from checkpoint", () => {
      const checkpoint = createMockCheckpoint({
        id: "test-id",
        stepNumber: 5,
        contextWindow: 200000,
        usage: {
          inputTokens: 50,
          outputTokens: 25,
          reasoningTokens: 5,
          totalTokens: 80,
          cachedInputTokens: 10,
        },
        pendingToolCalls: [{ id: "tc-1", skillName: "s", toolName: "t", args: {} }],
        partialToolResults: [{ id: "tr-1", skillName: "s", toolName: "t", result: [] }],
        delegatedBy: {
          expert: { key: "parent", name: "Parent", version: "1.0" },
          toolCallId: "p-tc-1",
          toolName: "delegateTo",
          checkpointId: "p-cp-id",
        },
        // These should NOT be included in context
        messages: [{ id: "m", type: "userMessage", contents: [] }],
      })

      const context = extractDelegationContext(checkpoint)

      expect(context.id).toBe("test-id")
      expect(context.stepNumber).toBe(5)
      expect(context.contextWindow).toBe(200000)
      expect(context.usage.inputTokens).toBe(50)
      expect(context.pendingToolCalls).toHaveLength(1)
      expect(context.partialToolResults).toHaveLength(1)
      expect(context.delegatedBy).toBeDefined()
      expect(context.delegatedBy?.expert.key).toBe("parent")
      // Messages are included for parent continuation after delegation
      expect(context.messages).toBeDefined()
      expect(context.messages).toHaveLength(1)
    })
  })

  describe("buildReturnFromDelegation()", () => {
    it("builds return state from completed delegation", async () => {
      const { buildReturnFromDelegation } = await import("./delegation-strategy.js")
      const currentSetting = createMockSetting()
      const resultCheckpoint = createMockCheckpoint({
        status: "completed",
        delegatedBy: {
          expert: { key: "parent", name: "Parent", version: "1.0" },
          toolCallId: "tc-1",
          toolName: "delegateTo",
          checkpointId: "parent-cp",
        },
        messages: [
          {
            id: "msg-delegation",
            type: "expertMessage",
            contents: [{ type: "textPart", id: "txt-1", text: "Delegation result" }],
          },
        ],
      })
      const parentCheckpoint = createMockCheckpoint({
        id: "parent-cp",
        expert: { key: "parent", name: "Parent", version: "1.0" },
      })

      const result = buildReturnFromDelegation(currentSetting, resultCheckpoint, parentCheckpoint)

      expect(result.setting).toBeDefined()
      expect(result.checkpoint).toBeDefined()
    })
  })
})
