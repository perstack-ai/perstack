import type { LogEntry } from "../types/log-entry.js"

/**
 * Represents a group of log entries belonging to the same run
 */
export type RunGroup = {
  runId: string
  expertKey: string
  entries: LogEntry[]
  delegatedBy?: {
    expertKey: string
    runId: string
  }
}

/**
 * Groups log entries by their runId while preserving order.
 *
 * This function groups logs so that each run can be displayed in its own
 * visual section (e.g., separate <Static> components in Ink).
 *
 * @param logs - Array of log entries to group
 * @returns Array of RunGroup objects, ordered by first appearance
 */
export function groupLogsByRun(logs: LogEntry[]): RunGroup[] {
  const groupMap = new Map<string, RunGroup>()
  const order: string[] = []

  for (const entry of logs) {
    const { runId, expertKey, delegatedBy } = entry

    if (!groupMap.has(runId)) {
      groupMap.set(runId, {
        runId,
        expertKey,
        entries: [],
        delegatedBy,
      })
      order.push(runId)
    }

    const group = groupMap.get(runId)!
    group.entries.push(entry)
  }

  return order.map((runId) => groupMap.get(runId)!)
}
