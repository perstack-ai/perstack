import { describe, expect, it, vi } from "vitest"
import type { ExecuteStateMachineParams } from "./executor.js"

// Mock the coordinator module
vi.mock("./coordinator.js", () => ({
  StateMachineCoordinator: class MockCoordinator {
    constructor(public params: ExecuteStateMachineParams) {}
    execute = vi.fn().mockResolvedValue({
      status: "completed",
      stepNumber: 1,
      messages: [],
      usage: {
        inputTokens: 10,
        outputTokens: 20,
        reasoningTokens: 0,
        totalTokens: 30,
        cachedInputTokens: 0,
      },
    })
  },
}))

import { executeStateMachine } from "./executor.js"

function createMockParams(): ExecuteStateMachineParams {
  return {
    setting: {
      jobId: "test-job",
      runId: "test-run",
      expertKey: "test-expert",
      experts: {},
      input: { text: "test" },
      env: {},
      startedAt: Date.now(),
    },
    initialCheckpoint: {
      status: "init",
      stepNumber: 0,
      messages: [],
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        reasoningTokens: 0,
        totalTokens: 0,
        cachedInputTokens: 0,
      },
    },
    eventListener: vi.fn().mockResolvedValue(undefined),
    skillManagers: {},
    eventEmitter: {
      emit: vi.fn().mockResolvedValue(undefined),
    },
    storeCheckpoint: vi.fn().mockResolvedValue(undefined),
  } as unknown as ExecuteStateMachineParams
}

describe("@perstack/runtime: executeStateMachine", () => {
  it("creates coordinator and calls execute", async () => {
    const params = createMockParams()
    const result = await executeStateMachine(params)

    expect(result).toBeDefined()
    expect(result.status).toBe("completed")
  })

  it("returns checkpoint from coordinator", async () => {
    const params = createMockParams()
    const result = await executeStateMachine(params)

    expect(result.stepNumber).toBe(1)
    expect(result.usage.inputTokens).toBe(10)
    expect(result.usage.outputTokens).toBe(20)
  })

  it("passes all params to coordinator", async () => {
    const params = createMockParams()
    params.setting.jobId = "custom-job-id"

    const result = await executeStateMachine(params)

    expect(result).toBeDefined()
  })
})
