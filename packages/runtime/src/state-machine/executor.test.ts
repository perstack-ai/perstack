import type { Checkpoint, Expert, RunSetting } from "@perstack/core"
import { describe, expect, it, vi } from "vitest"

// Mock xstate
vi.mock("xstate", () => ({
  createActor: vi.fn(() => ({
    subscribe: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    send: vi.fn(),
  })),
}))

// Mock skill-manager
vi.mock("../skill-manager/index.js", () => ({
  closeSkillManagers: vi.fn().mockResolvedValue(undefined),
}))

// Mock the machine
vi.mock("./machine.js", () => ({
  runtimeStateMachine: {},
  StateMachineLogics: {
    Init: vi.fn(),
    PreparingForStep: vi.fn(),
    GeneratingToolCall: vi.fn(),
    CallingTool: vi.fn(),
    ResolvingToolResult: vi.fn(),
    ResolvingThought: vi.fn(),
    GeneratingRunResult: vi.fn(),
    CallingInteractiveTool: vi.fn(),
    CallingDelegate: vi.fn(),
    FinishingStep: vi.fn(),
  },
}))

import { createActor } from "xstate"
import type { RunEventEmitter } from "../events/event-emitter.js"
import { closeSkillManagers } from "../skill-manager/index.js"
import { executeStateMachine } from "./executor.js"

function createTestSetting(): RunSetting & { experts: Record<string, Expert> } {
  const expert: Expert = {
    key: "test-expert",
    name: "@test/expert",
    version: "1.0.0",
    description: "Test",
    instruction: "Test",
    skills: {},
    delegates: [],
    tags: [],
  }
  return {
    jobId: "test-job-id",
    runId: "test-run-id",
    expertKey: "test-expert",
    model: "claude-sonnet-4-5",
    providerConfig: { providerName: "anthropic", apiKey: "test-key" },
    env: {},
    experts: { [expert.key]: expert },
  }
}

function createTestCheckpoint(): Checkpoint {
  return {
    id: "test-checkpoint-id",
    jobId: "test-job-id",
    runId: "test-run-id",
    expertKey: "test-expert",
    stepNumber: 0,
    status: "proceeding",
    messages: [],
    usage: { inputTokens: 0, outputTokens: 0 },
  }
}

describe("@perstack/runtime: executeStateMachine", () => {
  it("creates actor with correct input", async () => {
    const setting = createTestSetting()
    const checkpoint = createTestCheckpoint()
    const eventListener = vi.fn()
    const skillManagers = {}
    const eventEmitter = { emit: vi.fn() } as unknown as RunEventEmitter
    const storeCheckpoint = vi.fn()

    // Setup actor to immediately resolve with Stopped state
    const mockSubscribe = vi.fn((callback: (state: unknown) => void) => {
      setTimeout(() => {
        callback({
          value: "Stopped",
          context: {
            checkpoint: { ...checkpoint, status: "completed" },
            skillManagers: {},
          },
        })
      }, 0)
    })

    vi.mocked(createActor).mockReturnValue({
      subscribe: mockSubscribe,
      start: vi.fn(),
      stop: vi.fn(),
      send: vi.fn(),
    } as unknown as ReturnType<typeof createActor>)

    const promise = executeStateMachine({
      setting,
      initialCheckpoint: checkpoint,
      eventListener,
      skillManagers,
      eventEmitter,
      storeCheckpoint,
    })

    await promise

    expect(createActor).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        input: expect.objectContaining({
          setting,
          initialCheckpoint: checkpoint,
          eventListener,
          skillManagers,
        }),
      }),
    )
  })

  it("starts the actor after subscribing", async () => {
    const setting = createTestSetting()
    const checkpoint = createTestCheckpoint()
    const eventListener = vi.fn()
    const eventEmitter = { emit: vi.fn() } as unknown as RunEventEmitter
    const storeCheckpoint = vi.fn()

    const mockStart = vi.fn()
    const mockSubscribe = vi.fn((callback: (state: unknown) => void) => {
      setTimeout(() => {
        callback({
          value: "Stopped",
          context: {
            checkpoint: { ...checkpoint, status: "completed" },
            skillManagers: {},
          },
        })
      }, 0)
    })

    vi.mocked(createActor).mockReturnValue({
      subscribe: mockSubscribe,
      start: mockStart,
      stop: vi.fn(),
      send: vi.fn(),
    } as unknown as ReturnType<typeof createActor>)

    await executeStateMachine({
      setting,
      initialCheckpoint: checkpoint,
      eventListener,
      skillManagers: {},
      eventEmitter,
      storeCheckpoint,
    })

    expect(mockStart).toHaveBeenCalled()
  })

  it("resolves with checkpoint when actor reaches Stopped state", async () => {
    const setting = createTestSetting()
    const checkpoint = createTestCheckpoint()
    const eventListener = vi.fn()
    const eventEmitter = { emit: vi.fn() } as unknown as RunEventEmitter
    const storeCheckpoint = vi.fn()

    const completedCheckpoint = { ...checkpoint, status: "completed" as const }

    const mockSubscribe = vi.fn((callback: (state: unknown) => void) => {
      setTimeout(() => {
        callback({
          value: "Stopped",
          context: {
            checkpoint: completedCheckpoint,
            skillManagers: {},
          },
        })
      }, 0)
    })

    vi.mocked(createActor).mockReturnValue({
      subscribe: mockSubscribe,
      start: vi.fn(),
      stop: vi.fn(),
      send: vi.fn(),
    } as unknown as ReturnType<typeof createActor>)

    const result = await executeStateMachine({
      setting,
      initialCheckpoint: checkpoint,
      eventListener,
      skillManagers: {},
      eventEmitter,
      storeCheckpoint,
    })

    expect(result.status).toBe("completed")
  })

  it("closes skill managers when reaching Stopped state", async () => {
    const setting = createTestSetting()
    const checkpoint = createTestCheckpoint()
    const eventListener = vi.fn()
    const skillManagers = { "test-skill": {} }
    const eventEmitter = { emit: vi.fn() } as unknown as RunEventEmitter
    const storeCheckpoint = vi.fn()

    const mockSubscribe = vi.fn((callback: (state: unknown) => void) => {
      setTimeout(() => {
        callback({
          value: "Stopped",
          context: {
            checkpoint: { ...checkpoint, status: "completed" },
            skillManagers,
          },
        })
      }, 0)
    })

    vi.mocked(createActor).mockReturnValue({
      subscribe: mockSubscribe,
      start: vi.fn(),
      stop: vi.fn(),
      send: vi.fn(),
    } as unknown as ReturnType<typeof createActor>)

    await executeStateMachine({
      setting,
      initialCheckpoint: checkpoint,
      eventListener,
      skillManagers: {},
      eventEmitter,
      storeCheckpoint,
    })

    expect(closeSkillManagers).toHaveBeenCalled()
  })

  it("rejects when checkpoint is undefined in Stopped state", async () => {
    const setting = createTestSetting()
    const checkpoint = createTestCheckpoint()
    const eventListener = vi.fn()
    const eventEmitter = { emit: vi.fn() } as unknown as RunEventEmitter
    const storeCheckpoint = vi.fn()

    const mockSubscribe = vi.fn((callback: (state: unknown) => void) => {
      setTimeout(() => {
        callback({
          value: "Stopped",
          context: {
            checkpoint: undefined,
            skillManagers: {},
          },
        })
      }, 0)
    })

    vi.mocked(createActor).mockReturnValue({
      subscribe: mockSubscribe,
      start: vi.fn(),
      stop: vi.fn(),
      send: vi.fn(),
    } as unknown as ReturnType<typeof createActor>)

    await expect(
      executeStateMachine({
        setting,
        initialCheckpoint: checkpoint,
        eventListener,
        skillManagers: {},
        eventEmitter,
        storeCheckpoint,
      }),
    ).rejects.toThrow("Checkpoint is undefined")
  })
})
