import type { Checkpoint, RunEvent } from "@perstack/core"
import { describe, expect, it, vi } from "vitest"
import type { ActorFactory } from "./actor-factory.js"
import {
  StateMachineCoordinator,
  type StateMachineLogicsType,
  type StateMachineParams,
} from "./coordinator.js"
import type { RunSnapshot } from "./machine.js"

function createMockParams(overrides: Partial<StateMachineParams> = {}): StateMachineParams {
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
    ...overrides,
  } as StateMachineParams
}

function createMockActor(subscribeCallback?: (state: RunSnapshot) => void) {
  const subscribers: Array<(state: RunSnapshot) => void> = []
  return {
    subscribe: vi.fn((callback: (state: RunSnapshot) => void) => {
      subscribers.push(callback)
      if (subscribeCallback) {
        subscribeCallback = callback
      }
      return { unsubscribe: vi.fn() }
    }),
    start: vi.fn(() => {
      // Simulate starting and immediately transitioning to Stopped
      for (const sub of subscribers) {
        sub({
          value: "Stopped",
          context: {
            setting: {} as never,
            step: {} as never,
            checkpoint: {
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
            },
            eventListener: vi.fn(),
            skillManagers: {},
          },
        } as unknown as RunSnapshot)
      }
    }),
    stop: vi.fn(),
    send: vi.fn(),
  }
}

function createMockActorFactory(actor = createMockActor()): ActorFactory {
  return {
    create: vi.fn().mockReturnValue(actor),
  }
}

describe("@perstack/runtime: StateMachineCoordinator", () => {
  describe("constructor", () => {
    it("uses default dependencies when not provided", () => {
      const params = createMockParams()
      const coordinator = new StateMachineCoordinator(params)
      expect(coordinator).toBeDefined()
    })

    it("accepts custom dependencies", () => {
      const params = createMockParams()
      const mockFactory = createMockActorFactory()
      const mockCloseManagers = vi.fn().mockResolvedValue(undefined)
      const mockLogics = {} as unknown as StateMachineLogicsType

      const coordinator = new StateMachineCoordinator(params, {
        actorFactory: mockFactory,
        closeSkillManagers: mockCloseManagers,
        logics: mockLogics,
      })

      expect(coordinator).toBeDefined()
    })
  })

  describe("execute", () => {
    it("creates actor using factory", async () => {
      const params = createMockParams()
      const mockActor = createMockActor()
      const mockFactory = createMockActorFactory(mockActor)
      const mockCloseManagers = vi.fn().mockResolvedValue(undefined)

      const coordinator = new StateMachineCoordinator(params, {
        actorFactory: mockFactory,
        closeSkillManagers: mockCloseManagers,
      })

      await coordinator.execute()

      expect(mockFactory.create).toHaveBeenCalledTimes(1)
      expect(mockFactory.create).toHaveBeenCalledWith({
        input: {
          setting: params.setting,
          initialCheckpoint: params.initialCheckpoint,
          eventListener: params.eventListener,
          skillManagers: params.skillManagers,
        },
      })
    })

    it("starts the actor", async () => {
      const params = createMockParams()
      const mockActor = createMockActor()
      const mockFactory = createMockActorFactory(mockActor)
      const mockCloseManagers = vi.fn().mockResolvedValue(undefined)

      const coordinator = new StateMachineCoordinator(params, {
        actorFactory: mockFactory,
        closeSkillManagers: mockCloseManagers,
      })

      await coordinator.execute()

      expect(mockActor.start).toHaveBeenCalledTimes(1)
    })

    it("subscribes to actor state changes", async () => {
      const params = createMockParams()
      const mockActor = createMockActor()
      const mockFactory = createMockActorFactory(mockActor)
      const mockCloseManagers = vi.fn().mockResolvedValue(undefined)

      const coordinator = new StateMachineCoordinator(params, {
        actorFactory: mockFactory,
        closeSkillManagers: mockCloseManagers,
      })

      await coordinator.execute()

      expect(mockActor.subscribe).toHaveBeenCalledTimes(1)
    })

    it("returns checkpoint when state machine stops", async () => {
      const params = createMockParams()
      const mockActor = createMockActor()
      const mockFactory = createMockActorFactory(mockActor)
      const mockCloseManagers = vi.fn().mockResolvedValue(undefined)

      const coordinator = new StateMachineCoordinator(params, {
        actorFactory: mockFactory,
        closeSkillManagers: mockCloseManagers,
      })

      const result = await coordinator.execute()

      expect(result).toBeDefined()
      expect(result.status).toBe("completed")
    })

    it("closes skill managers when stopped", async () => {
      const params = createMockParams()
      const mockActor = createMockActor()
      const mockFactory = createMockActorFactory(mockActor)
      const mockCloseManagers = vi.fn().mockResolvedValue(undefined)

      const coordinator = new StateMachineCoordinator(params, {
        actorFactory: mockFactory,
        closeSkillManagers: mockCloseManagers,
      })

      await coordinator.execute()

      expect(mockCloseManagers).toHaveBeenCalledTimes(1)
    })
  })

  describe("handleStateChange", () => {
    it("handles stopped state correctly", async () => {
      const params = createMockParams()
      const mockCloseManagers = vi.fn().mockResolvedValue(undefined)

      // Create actor that doesn't auto-start
      const mockActor = {
        subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
        start: vi.fn(),
        stop: vi.fn(),
        send: vi.fn(),
      }
      const mockFactory = createMockActorFactory(mockActor as never)

      const coordinator = new StateMachineCoordinator(params, {
        actorFactory: mockFactory,
        closeSkillManagers: mockCloseManagers,
      })

      const stoppedState = {
        value: "Stopped",
        context: {
          checkpoint: {
            status: "completed",
            stepNumber: 1,
            messages: [],
            usage: {
              inputTokens: 0,
              outputTokens: 0,
              reasoningTokens: 0,
              totalTokens: 0,
              cachedInputTokens: 0,
            },
          },
          skillManagers: {},
        },
      } as unknown as RunSnapshot

      // Start execution (won't complete since actor doesn't auto-transition)
      const executePromise = coordinator.execute()

      // Manually trigger state change
      const subscribeCallback = mockActor.subscribe.mock.calls[0][0]
      await subscribeCallback(stoppedState)

      const result = await executePromise
      expect(result.status).toBe("completed")
      expect(mockCloseManagers).toHaveBeenCalled()
    })

    it("handles active state and calls logics", async () => {
      const params = createMockParams()
      const mockCloseManagers = vi.fn().mockResolvedValue(undefined)
      const mockEvent: RunEvent = { type: "startRun" } as unknown as RunEvent

      const mockInitLogic = vi.fn().mockResolvedValue(mockEvent)
      const mockLogics = {
        Init: mockInitLogic,
      } as unknown as StateMachineLogicsType

      // Create actor that stays in Init state first
      let stateIndex = 0
      const states = [
        {
          value: "Init",
          context: {
            setting: params.setting,
            step: {},
            checkpoint: params.initialCheckpoint,
            eventListener: params.eventListener,
            skillManagers: {},
          },
        },
        {
          value: "Stopped",
          context: {
            checkpoint: { status: "completed", stepNumber: 1, messages: [], usage: {} },
            skillManagers: {},
          },
        },
      ]

      const subscribers: Array<(state: RunSnapshot) => void> = []
      const mockActor = {
        subscribe: vi.fn((callback) => {
          subscribers.push(callback)
          return { unsubscribe: vi.fn() }
        }),
        start: vi.fn(() => {
          for (const sub of subscribers) {
            sub(states[stateIndex++] as unknown as RunSnapshot)
          }
        }),
        stop: vi.fn(),
        send: vi.fn(() => {
          // On send, transition to next state
          for (const sub of subscribers) {
            sub(states[stateIndex++] as unknown as RunSnapshot)
          }
        }),
      }
      const mockFactory = createMockActorFactory(mockActor as never)

      const coordinator = new StateMachineCoordinator(params, {
        actorFactory: mockFactory,
        closeSkillManagers: mockCloseManagers,
        logics: mockLogics,
      })

      await coordinator.execute()

      expect(mockInitLogic).toHaveBeenCalledTimes(1)
      expect(params.eventEmitter.emit).toHaveBeenCalledWith(mockEvent)
      expect(mockActor.send).toHaveBeenCalledWith(mockEvent)
    })

    it("stores checkpoint when event contains checkpoint", async () => {
      const params = createMockParams()
      const mockCloseManagers = vi.fn().mockResolvedValue(undefined)
      const eventCheckpoint = {
        status: "proceeding",
        stepNumber: 1,
        messages: [],
        usage: {
          inputTokens: 5,
          outputTokens: 10,
          reasoningTokens: 0,
          totalTokens: 15,
          cachedInputTokens: 0,
        },
      } as unknown as Checkpoint
      const mockEvent = { type: "startRun", checkpoint: eventCheckpoint } as unknown as RunEvent

      const mockLogics = {
        Init: vi.fn().mockResolvedValue(mockEvent),
      } as unknown as StateMachineLogicsType

      let stateIndex = 0
      const states = [
        { value: "Init", context: { checkpoint: params.initialCheckpoint, skillManagers: {} } },
        {
          value: "Stopped",
          context: { checkpoint: { status: "completed" }, skillManagers: {} },
        },
      ]

      const subscribers: Array<(state: RunSnapshot) => void> = []
      const mockActor = {
        subscribe: vi.fn((callback) => {
          subscribers.push(callback)
          return { unsubscribe: vi.fn() }
        }),
        start: vi.fn(() => {
          for (const sub of subscribers) {
            sub(states[stateIndex++] as unknown as RunSnapshot)
          }
        }),
        stop: vi.fn(),
        send: vi.fn(() => {
          for (const sub of subscribers) {
            sub(states[stateIndex++] as unknown as RunSnapshot)
          }
        }),
      }
      const mockFactory = createMockActorFactory(mockActor as never)

      const coordinator = new StateMachineCoordinator(params, {
        actorFactory: mockFactory,
        closeSkillManagers: mockCloseManagers,
        logics: mockLogics,
      })

      await coordinator.execute()

      expect(params.storeCheckpoint).toHaveBeenCalledWith(eventCheckpoint)
    })

    it("respects shouldContinueRun callback", async () => {
      const shouldContinueRun = vi.fn().mockResolvedValue(false)
      const params = createMockParams({ shouldContinueRun })
      const mockCloseManagers = vi.fn().mockResolvedValue(undefined)
      const mockEvent = { type: "startRun" } as unknown as RunEvent

      const mockLogics = {
        Init: vi.fn().mockResolvedValue(mockEvent),
      } as unknown as StateMachineLogicsType

      const subscribers: Array<(state: RunSnapshot) => void> = []
      const mockActor = {
        subscribe: vi.fn((callback) => {
          subscribers.push(callback)
          return { unsubscribe: vi.fn() }
        }),
        start: vi.fn(() => {
          for (const sub of subscribers) {
            sub({
              value: "Init",
              context: {
                setting: params.setting,
                step: {},
                checkpoint: params.initialCheckpoint,
                skillManagers: {},
              },
            } as unknown as RunSnapshot)
          }
        }),
        stop: vi.fn(),
        send: vi.fn(),
      }
      const mockFactory = createMockActorFactory(mockActor as never)

      const coordinator = new StateMachineCoordinator(params, {
        actorFactory: mockFactory,
        closeSkillManagers: mockCloseManagers,
        logics: mockLogics,
      })

      await coordinator.execute()

      expect(shouldContinueRun).toHaveBeenCalledTimes(1)
      expect(mockActor.stop).toHaveBeenCalledTimes(1)
      expect(mockCloseManagers).toHaveBeenCalledTimes(1)
      expect(mockActor.send).not.toHaveBeenCalled()
    })
  })

  describe("error handling", () => {
    it("closes skill managers on error", async () => {
      const params = createMockParams()
      const mockCloseManagers = vi.fn().mockResolvedValue(undefined)
      const testError = new Error("Test error")

      const mockLogics = {
        Init: vi.fn().mockRejectedValue(testError),
      } as unknown as StateMachineLogicsType

      const subscribers: Array<(state: RunSnapshot) => void> = []
      const mockActor = {
        subscribe: vi.fn((callback) => {
          subscribers.push(callback)
          return { unsubscribe: vi.fn() }
        }),
        start: vi.fn(() => {
          for (const sub of subscribers) {
            sub({
              value: "Init",
              context: { checkpoint: params.initialCheckpoint, skillManagers: {} },
            } as unknown as RunSnapshot)
          }
        }),
        stop: vi.fn(),
        send: vi.fn(),
      }
      const mockFactory = createMockActorFactory(mockActor as never)

      const coordinator = new StateMachineCoordinator(params, {
        actorFactory: mockFactory,
        closeSkillManagers: mockCloseManagers,
        logics: mockLogics,
      })

      await expect(coordinator.execute()).rejects.toThrow("Test error")
      expect(mockCloseManagers).toHaveBeenCalledTimes(1)
    })

    it("throws error when checkpoint is undefined in stopped state", async () => {
      const params = createMockParams()
      const mockCloseManagers = vi.fn().mockResolvedValue(undefined)

      const subscribers: Array<(state: RunSnapshot) => void> = []
      const mockActor = {
        subscribe: vi.fn((callback) => {
          subscribers.push(callback)
          return { unsubscribe: vi.fn() }
        }),
        start: vi.fn(() => {
          for (const sub of subscribers) {
            sub({
              value: "Stopped",
              context: { checkpoint: undefined, skillManagers: {} },
            } as unknown as RunSnapshot)
          }
        }),
        stop: vi.fn(),
        send: vi.fn(),
      }
      const mockFactory = createMockActorFactory(mockActor as never)

      const coordinator = new StateMachineCoordinator(params, {
        actorFactory: mockFactory,
        closeSkillManagers: mockCloseManagers,
      })

      await expect(coordinator.execute()).rejects.toThrow("Checkpoint is undefined")
    })
  })
})
