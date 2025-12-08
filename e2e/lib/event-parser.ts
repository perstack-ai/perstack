import type { RunEvent } from "@perstack/core"

export type ParsedEvent = RunEvent & { raw: string }

export function parseEvents(output: string): ParsedEvent[] {
  const events: ParsedEvent[] = []
  for (const line of output.split("\n")) {
    try {
      const data = JSON.parse(line) as RunEvent
      if (data.type) {
        events.push({ ...data, raw: line })
      }
    } catch {
      // Not JSON, skip
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
  const relevantTypes = [
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
  ]
  return events.filter((e) => relevantTypes.includes(e.type)).map((e) => e.type)
}

export type ToolCallInfo = {
  id: string
  skillName: string
  toolName: string
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

export type CheckpointState = {
  status: string
  pendingToolCalls: ToolCallInfo[]
  partialToolResults: ToolCallInfo[]
}

export function extractCheckpointState(event: ParsedEvent): CheckpointState | null {
  const checkpoint = (event as { checkpoint?: Record<string, unknown> }).checkpoint
  if (!checkpoint) return null
  const pendingToolCalls = (checkpoint.pendingToolCalls ?? []) as ToolCallInfo[]
  const partialToolResults = (checkpoint.partialToolResults ?? []) as ToolCallInfo[]
  return {
    status: checkpoint.status as string,
    pendingToolCalls: pendingToolCalls.map((tc) => ({
      id: tc.id,
      skillName: tc.skillName,
      toolName: tc.toolName,
    })),
    partialToolResults: partialToolResults.map((tr) => ({
      id: tr.id,
      skillName: tr.skillName,
      toolName: tr.toolName,
    })),
  }
}

