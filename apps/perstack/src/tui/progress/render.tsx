import { render } from "ink"
import type { PerstackEvent } from "../types/index.js"
import { EventQueue } from "../utils/event-queue.js"
import { ProgressApp } from "./app.js"

type RenderProgressOptions = {
  title?: string
}

export type ProgressHandle = {
  emit: (event: PerstackEvent) => void
  waitUntilExit: () => Promise<void>
}

export function renderProgress(options: RenderProgressOptions): ProgressHandle {
  const eventQueue = new EventQueue()
  let exitResolve: (() => void) | null = null
  const exitPromise = new Promise<void>((resolve) => {
    exitResolve = resolve
  })
  const { waitUntilExit } = render(
    <ProgressApp
      title={options.title}
      onReady={(addEvent) => eventQueue.setHandler(addEvent)}
      onExit={() => exitResolve?.()}
    />,
  )
  waitUntilExit().then(() => exitResolve?.())
  return {
    emit: (event: PerstackEvent) => eventQueue.emit(event),
    waitUntilExit: () => exitPromise,
  }
}
