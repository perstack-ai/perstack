import type { Activity } from "@perstack/core"
import { Box, Static, Text } from "ink"
import type React from "react"
import { useMemo } from "react"
import { CheckpointActionRow } from "../../components/index.js"

type ActivityLogPanelProps = {
  activities: Activity[]
}

export const ActivityLogPanel = ({ activities }: ActivityLogPanelProps): React.ReactNode => {
  const firstActivityIdByRunId = useMemo(() => {
    const map = new Map<string, string>()
    for (const activity of activities) {
      if (!map.has(activity.runId)) {
        map.set(activity.runId, activity.id)
      }
    }
    return map
  }, [activities])

  return (
    <Static items={activities}>
      {(activity) => {
        const isFirstInGroup = firstActivityIdByRunId.get(activity.runId) === activity.id
        const showHeader = isFirstInGroup && activity.delegatedBy

        return (
          <Box key={activity.id} flexDirection="column" marginLeft={activity.delegatedBy ? 2 : 0}>
            {showHeader && (
              <Box borderStyle="single" borderColor="gray" paddingX={1}>
                <Text dimColor>
                  [{activity.expertKey}] Delegated by [{activity.delegatedBy?.expertKey}]
                </Text>
              </Box>
            )}
            <CheckpointActionRow action={activity} />
          </Box>
        )
      }}
    </Static>
  )
}
