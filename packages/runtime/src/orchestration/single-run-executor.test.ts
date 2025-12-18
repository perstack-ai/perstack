import type { Checkpoint, Expert, RunSetting } from "@perstack/core"
import { describe, expect, it, vi } from "vitest"
import { SingleRunExecutor } from "./single-run-executor.js"

// Mock dependencies
vi.mock("../helpers/index.js", () => ({
  getContextWindow: vi.fn().mockReturnValue(100000),
  setupExperts: vi.fn().mockResolvedValue({
    expertToRun: {
      key: "test-expert",
      name: "Test Expert",
      version: "1.0.0",
      instructions: "Test instructions",
    },
    experts: {
      "test-expert": {
        key: "test-expert",
        name: "Test Expert",
        version: "1.0.0",
        instructions: "Test instructions",
      },
    },
  }),
  createInitialCheckpoint: vi.fn().mockImplementation((id, params) => ({
    id,
    jobId: params.jobId,
    runId: params.runId,
    status: "init",
    stepNumber: 0,
    messages: [],
    expert: params.expert,
    usage: {
      inputTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      totalTokens: 0,
      cachedInputTokens: 0,
    },
    contextWindow: params.contextWindow,
  })),
  createNextStepCheckpoint: vi.fn().mockImplementation((id, checkpoint) => ({
    ...checkpoint,
    id,
    stepNumber: checkpoint.stepNumber + 1,
  })),
}))

vi.mock("../skill-manager/index.js", () => ({
  getSkillManagers: vi.fn().mockResolvedValue({}),
}))

vi.mock("../state-machine/index.js", () => ({
  executeStateMachine: vi.fn().mockResolvedValue({
    id: "result-cp",
    jobId: "job-1",
    runId: "run-1",
    status: "completed",
    stepNumber: 1,
    messages: [],
    expert: { key: "test-expert", name: "Test Expert", version: "1.0.0" },
    usage: {
      inputTokens: 100,
      outputTokens: 50,
      reasoningTokens: 0,
      totalTokens: 150,
      cachedInputTokens: 0,
    },
    contextWindow: 100000,
  }),
}))

const createMockSetting = (overrides?: Partial<RunSetting>): RunSetting =>
  ({
    jobId: "job-1",
    runId: "run-1",
    expertKey: "test-expert",
    model: "claude-sonnet-4-20250514",
    temperature: 0.7,
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
    status: "completed",
    stepNumber: 1,
    messages: [],
    expert: { key: "test-expert", name: "Test Expert", version: "1.0.0" },
    usage: {
      inputTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      totalTokens: 0,
      cachedInputTokens: 0,
    },
    contextWindow: 100000,
    ...overrides,
  }) as Checkpoint

describe("@perstack/runtime: single-run-executor", () => {
  describe("SingleRunExecutor", () => {
    it("can be instantiated with no options", () => {
      const executor = new SingleRunExecutor()
      expect(executor).toBeDefined()
    })

    it("can be instantiated with options", () => {
      const executor = new SingleRunExecutor({
        shouldContinueRun: async () => true,
        storeCheckpoint: async () => {},
        eventListener: () => {},
        resolveExpertToRun: async () => ({}) as Expert,
      })
      expect(executor).toBeDefined()
    })

    it("executes and returns run result with checkpoint", async () => {
      const executor = new SingleRunExecutor()
      const setting = createMockSetting()

      const result = await executor.execute(setting)

      expect(result).toBeDefined()
      expect(result.checkpoint).toBeDefined()
      expect(result.checkpoint.status).toBe("completed")
      expect(result.expertToRun).toBeDefined()
      expect(result.expertToRun.key).toBe("test-expert")
      expect(result.experts).toBeDefined()
    })

    it("creates initial checkpoint when no checkpoint provided", async () => {
      const { createInitialCheckpoint } = await import("../helpers/index.js")
      const executor = new SingleRunExecutor()
      const setting = createMockSetting()

      await executor.execute(setting)

      expect(createInitialCheckpoint).toHaveBeenCalled()
    })

    it("creates next step checkpoint when checkpoint provided", async () => {
      const { createNextStepCheckpoint } = await import("../helpers/index.js")
      const executor = new SingleRunExecutor()
      const setting = createMockSetting()
      const checkpoint = createMockCheckpoint()

      await executor.execute(setting, checkpoint)

      expect(createNextStepCheckpoint).toHaveBeenCalled()
    })

    it("emits init event when eventListener is provided", async () => {
      const eventListener = vi.fn()
      const executor = new SingleRunExecutor({ eventListener })
      const setting = createMockSetting()

      await executor.execute(setting)

      expect(eventListener).toHaveBeenCalled()
      const initEvent = eventListener.mock.calls[0][0]
      expect(initEvent).toHaveProperty("type")
    })

    it("does not emit init event when eventListener is not provided", async () => {
      const executor = new SingleRunExecutor()
      const setting = createMockSetting()

      // Should not throw
      await expect(executor.execute(setting)).resolves.toBeDefined()
    })

    it("passes isDelegatedRun flag to getSkillManagers", async () => {
      const { getSkillManagers } = await import("../skill-manager/index.js")
      const executor = new SingleRunExecutor()
      const setting = createMockSetting()
      const checkpoint = createMockCheckpoint({
        delegatedBy: {
          expert: { key: "parent", name: "Parent", version: "1.0" },
          toolCallId: "tc-1",
          toolName: "delegateTo",
          checkpointId: "parent-cp",
        },
      })

      await executor.execute(setting, checkpoint)

      expect(getSkillManagers).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        undefined,
        { isDelegatedRun: true },
      )
    })

    it("passes resolveExpertToRun to setupExperts", async () => {
      const { setupExperts } = await import("../helpers/index.js")
      const resolveExpertToRun = vi.fn().mockResolvedValue({} as Expert)
      const executor = new SingleRunExecutor({ resolveExpertToRun })
      const setting = createMockSetting()

      await executor.execute(setting)

      expect(setupExperts).toHaveBeenCalledWith(setting, resolveExpertToRun)
    })

    it("passes shouldContinueRun to executeStateMachine", async () => {
      const { executeStateMachine } = await import("../state-machine/index.js")
      const shouldContinueRun = vi.fn().mockResolvedValue(true)
      const executor = new SingleRunExecutor({ shouldContinueRun })
      const setting = createMockSetting()

      await executor.execute(setting)

      expect(executeStateMachine).toHaveBeenCalledWith(
        expect.objectContaining({
          shouldContinueRun,
        }),
      )
    })

    it("passes storeCheckpoint to executeStateMachine", async () => {
      const { executeStateMachine } = await import("../state-machine/index.js")
      const storeCheckpoint = vi.fn()
      const executor = new SingleRunExecutor({ storeCheckpoint })
      const setting = createMockSetting()

      await executor.execute(setting)

      expect(executeStateMachine).toHaveBeenCalledWith(
        expect.objectContaining({
          storeCheckpoint,
        }),
      )
    })
  })
})
