import type { Activity } from "@perstack/core"

/**
 * Represents a group of activities belonging to the same run
 */
export type RunGroup = {
  runId: string
  expertKey: string
  activities: Activity[]
  delegatedBy?: {
    expertKey: string
    runId: string
  }
}

/**
 * Groups activities by their runId while preserving order.
 *
 * This function groups activities so that each run can be displayed in its own
 * visual section (e.g., separate <Static> components in Ink).
 *
 * @param activities - Array of activities to group
 * @returns Array of RunGroup objects, ordered by first appearance
 */
export function groupActivitiesByRun(activities: Activity[]): RunGroup[] {
  const groupMap = new Map<string, RunGroup>()
  const order: string[] = []

  for (const activity of activities) {
    const { runId, expertKey, delegatedBy } = activity

    if (!groupMap.has(runId)) {
      groupMap.set(runId, {
        runId,
        expertKey,
        activities: [],
        delegatedBy,
      })
      order.push(runId)
    }

    const group = groupMap.get(runId)!
    group.activities.push(activity)
  }

  return order.map((runId) => groupMap.get(runId)!)
}

/** @deprecated Use groupActivitiesByRun instead */
export const groupLogsByRun = groupActivitiesByRun
