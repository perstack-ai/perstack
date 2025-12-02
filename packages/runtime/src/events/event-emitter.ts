import { createId } from "@paralleldrive/cuid2"
import type { RunEvent } from "@perstack/core"

export class RunEventEmitter {
  private listeners: ((event: RunEvent) => Promise<void>)[] = []

  subscribe(listener: (event: RunEvent) => Promise<void>) {
    this.listeners.push(listener)
  }

  async emit(event: RunEvent) {
    for (const listener of this.listeners) {
      await listener({
        ...event,
        id: createId(),
        timestamp: Date.now(),
      })
    }
  }
}
