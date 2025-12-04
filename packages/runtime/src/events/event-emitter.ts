import { createId } from "@paralleldrive/cuid2"
import type { RunEvent } from "@perstack/core"

export class RunEventEmitter {
  private listeners: ((event: RunEvent) => Promise<void>)[] = []

  subscribe(listener: (event: RunEvent) => Promise<void>) {
    this.listeners.push(listener)
  }

  async emit(event: RunEvent) {
    const enrichedEvent = {
      ...event,
      id: createId(),
      timestamp: Date.now(),
    }
    for (const listener of this.listeners) {
      try {
        await listener(enrichedEvent)
      } catch {}
    }
  }
}
