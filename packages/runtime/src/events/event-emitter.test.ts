import type { RunEvent } from "@perstack/core"
import { describe, expect, it, vi } from "vitest"
import { RunEventEmitter } from "./event-emitter.js"

function createMockEvent(overrides: Partial<RunEvent> = {}): RunEvent {
  return {
    type: "startRun",
    id: "test-id",
    expertKey: "test-expert",
    timestamp: Date.now(),
    runId: "test-run-id",
    stepNumber: 1,
    ...overrides,
  } as RunEvent
}

describe("@perstack/runtime: RunEventEmitter", () => {
  it("subscribes listener and emits event", async () => {
    const emitter = new RunEventEmitter()
    const listener = vi.fn()
    emitter.subscribe(listener)
    const event = createMockEvent()
    await emitter.emit(event)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "startRun",
        expertKey: "test-expert",
        runId: "test-run-id",
      }),
    )
  })

  it("notifies multiple listeners", async () => {
    const emitter = new RunEventEmitter()
    const listener1 = vi.fn()
    const listener2 = vi.fn()
    emitter.subscribe(listener1)
    emitter.subscribe(listener2)
    const event = createMockEvent()
    await emitter.emit(event)
    expect(listener1).toHaveBeenCalledTimes(1)
    expect(listener2).toHaveBeenCalledTimes(1)
  })

  it("generates new id and timestamp on emit", async () => {
    const emitter = new RunEventEmitter()
    const receivedEvents: RunEvent[] = []
    emitter.subscribe(async (e) => {
      receivedEvents.push(e)
    })
    const event = createMockEvent({ id: "original-id", timestamp: 1000 })
    await emitter.emit(event)
    expect(receivedEvents[0].id).not.toBe("original-id")
    expect(receivedEvents[0].timestamp).not.toBe(1000)
  })

  it("handles no listeners", async () => {
    const emitter = new RunEventEmitter()
    const event = createMockEvent()
    await expect(emitter.emit(event)).resolves.toBeUndefined()
  })

  it("calls listeners sequentially", async () => {
    const emitter = new RunEventEmitter()
    const callOrder: number[] = []
    emitter.subscribe(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      callOrder.push(1)
    })
    emitter.subscribe(async () => {
      callOrder.push(2)
    })
    await emitter.emit(createMockEvent())
    expect(callOrder).toEqual([1, 2])
  })

  it("continues calling listeners when one throws and aggregates errors", async () => {
    const emitter = new RunEventEmitter()
    const listener1 = vi.fn()
    const listener2 = vi.fn().mockRejectedValue(new Error("test error"))
    const listener3 = vi.fn()
    emitter.subscribe(listener1)
    emitter.subscribe(listener2)
    emitter.subscribe(listener3)
    await expect(emitter.emit(createMockEvent())).rejects.toThrow(AggregateError)
    expect(listener1).toHaveBeenCalledTimes(1)
    expect(listener2).toHaveBeenCalledTimes(1)
    expect(listener3).toHaveBeenCalledTimes(1)
  })
})

