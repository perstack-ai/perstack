import type { PerstackEvent } from "../types/index.js"

type ErrorLogger = (message: string, error: unknown) => void
const defaultErrorLogger: ErrorLogger = (message, error) => {
  console.error(message, error)
}
type EventQueueOptions = {
  onError?: (error: unknown) => void
  errorLogger?: ErrorLogger
}
export class EventQueue {
  private static readonly MAX_PENDING_EVENTS = 1000
  private pendingEvents: PerstackEvent[] = []
  private handler: ((event: PerstackEvent) => void) | null = null
  private readonly onError?: (error: unknown) => void
  private readonly errorLogger: ErrorLogger
  constructor(options?: EventQueueOptions) {
    this.onError = options?.onError
    this.errorLogger = options?.errorLogger ?? defaultErrorLogger
  }
  setHandler(fn: (event: PerstackEvent) => void): void {
    this.handler = fn
    for (const event of this.pendingEvents) {
      this.safeHandle(event)
    }
    this.pendingEvents.length = 0
  }
  emit(event: PerstackEvent): void {
    if (this.handler) {
      this.safeHandle(event)
    } else {
      if (this.pendingEvents.length >= EventQueue.MAX_PENDING_EVENTS) {
        this.pendingEvents.shift()
      }
      this.pendingEvents.push(event)
    }
  }
  private safeHandle(event: PerstackEvent): void {
    try {
      this.handler?.(event)
    } catch (error) {
      if (this.onError) {
        this.onError(error)
      } else {
        this.errorLogger("EventQueue handler error:", error)
      }
    }
  }
}
