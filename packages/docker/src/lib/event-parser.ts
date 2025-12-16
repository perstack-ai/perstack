import type { Checkpoint, RunEvent, RuntimeEvent } from "@perstack/core"
import { checkpointSchema } from "@perstack/core"
import { TERMINAL_EVENT_TYPES } from "./constants.js"

type ParsedEvent = RunEvent | RuntimeEvent
type TerminalEvent = ParsedEvent & { checkpoint: Checkpoint }

export function parseContainerEvent(line: string): ParsedEvent | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  let parsed: ParsedEvent
  try {
    parsed = JSON.parse(trimmed) as ParsedEvent
  } catch {
    return null
  }

  if (isTerminalEvent(parsed) && "checkpoint" in parsed) {
    try {
      parsed.checkpoint = checkpointSchema.parse(parsed.checkpoint)
    } catch {
      return null
    }
  }

  return parsed
}

export function isTerminalEvent(event: ParsedEvent): event is TerminalEvent {
  return TERMINAL_EVENT_TYPES.includes(event.type as (typeof TERMINAL_EVENT_TYPES)[number])
}

export function findTerminalEvent(
  events: Array<RunEvent | RuntimeEvent>,
): TerminalEvent | undefined {
  return events.find((e) => isTerminalEvent(e) && "checkpoint" in e) as TerminalEvent | undefined
}
