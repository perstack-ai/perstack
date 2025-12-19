import { createId } from "@paralleldrive/cuid2"
import type { RunEvent } from "@perstack/core"

export class RunEventEmitter {
  private listeners: ((event: RunEvent) => Promise<void>)[] = []

  subscribe(listener: (event: RunEvent) => Promise<void>) {
    this.listeners.push(listener)
  }

  async emit(event: RunEvent) {
    const errors: Error[] = []
    for (const listener of this.listeners) {
      try {
        await listener({
          ...event,
          id: createId(),
          timestamp: Date.now(),
        })
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)))
      }
    }
    if (errors.length > 0) {
      throw new AggregateError(errors, "One or more event listeners failed")
    }
  }
}
