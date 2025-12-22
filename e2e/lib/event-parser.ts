import type { RunEvent, RuntimeEvent } from "@perstack/core"

export type ParsedEvent = (RunEvent | RuntimeEvent) & { raw: string }

export type ToolCallInfo = {
  id: string
  skillName: string
  toolName: string
}

export type CheckpointState = {
  status: string
  pendingToolCalls: ToolCallInfo[]
  partialToolResults: ToolCallInfo[]
}

const RELEVANT_EVENT_TYPES = [
  "startRun",
  "callTools",
  "callDelegate",
  "callInteractiveTool",
  "stopRunByDelegate",
  "stopRunByInteractiveTool",
  "resumeToolCalls",
  "finishAllToolCalls",
  "completeRun",
  "resolveToolResults",
] as const

export function parseEvents(output: string): ParsedEvent[] {
  const events: ParsedEvent[] = []
  for (const line of output.split("\n")) {
    try {
      const data = JSON.parse(line) as RunEvent
      if (data.type) {
        events.push({ ...data, raw: line })
      }
    } catch {
      // skip
    }
  }
  return events
}

export function filterEventsByType<T extends RunEvent["type"]>(
  events: ParsedEvent[],
  type: T,
): Extract<ParsedEvent, { type: T }>[] {
  return events.filter((e) => e.type === type) as Extract<ParsedEvent, { type: T }>[]
}

export function getEventSequence(events: ParsedEvent[]): string[] {
  return events.filter((e) => RELEVANT_EVENT_TYPES.includes(e.type as never)).map((e) => e.type)
}

export function extractToolCalls(event: ParsedEvent): ToolCallInfo[] {
  if (event.type === "callTools") {
    return (event.toolCalls ?? []).map((tc) => ({
      id: tc.id,
      skillName: tc.skillName,
      toolName: tc.toolName,
    }))
  }
  return []
}

export function extractCheckpointState(event: ParsedEvent): CheckpointState | null {
  const checkpoint = (event as { checkpoint?: Record<string, unknown> }).checkpoint
  if (!checkpoint) return null
  const pending = (checkpoint.pendingToolCalls ?? []) as ToolCallInfo[]
  const partial = (checkpoint.partialToolResults ?? []) as ToolCallInfo[]
  return {
    status: checkpoint.status as string,
    pendingToolCalls: pending.map((tc) => ({
      id: tc.id,
      skillName: tc.skillName,
      toolName: tc.toolName,
    })),
    partialToolResults: partial.map((tr) => ({
      id: tr.id,
      skillName: tr.skillName,
      toolName: tr.toolName,
    })),
  }
}
