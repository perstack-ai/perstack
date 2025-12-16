import { EventEmitter } from "node:events"
import type { RunEvent, RuntimeEvent } from "@perstack/core"
import { vi } from "vitest"

export type MockProcess = {
  stdout: EventEmitter
  stderr: EventEmitter
  stdin: { end: () => void }
  kill: ReturnType<typeof vi.fn>
  on: (event: string, listener: (...args: unknown[]) => void) => void
  emit: (event: string, ...args: unknown[]) => boolean
}

export function createMockProcess(): MockProcess {
  const emitter = new EventEmitter()
  return {
    stdout: new EventEmitter(),
    stderr: new EventEmitter(),
    stdin: { end: vi.fn() },
    kill: vi.fn(),
    on: emitter.on.bind(emitter),
    emit: emitter.emit.bind(emitter),
  }
}

export function createEventCollector() {
  const events: Array<RunEvent | RuntimeEvent> = []
  const listener = (event: RunEvent | RuntimeEvent) => events.push(event)
  return { events, listener }
}

export function findContainerStatusEvent(
  events: Array<RunEvent | RuntimeEvent>,
  status: string,
  service: string,
): (RunEvent | RuntimeEvent) | undefined {
  return events.find(
    (e) =>
      "type" in e &&
      e.type === "dockerContainerStatus" &&
      "status" in e &&
      e.status === status &&
      "service" in e &&
      e.service === service,
  )
}

export function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
