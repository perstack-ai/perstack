import type { Activity } from "@perstack/core"
import { Box, Static, Text } from "ink"
import type React from "react"
import { useRef } from "react"
import { CheckpointActionRow } from "../../components/index.js"

type ActivityLogPanelProps = {
  activities: Activity[]
}

export const ActivityLogPanel = ({ activities }: ActivityLogPanelProps): React.ReactNode => {
  const seenRunIdsRef = useRef<Set<string>>(new Set())

  return (
    <Static items={activities}>
      {(activity) => {
        const isFirstInGroup = !seenRunIdsRef.current.has(activity.runId)
        if (isFirstInGroup) {
          seenRunIdsRef.current.add(activity.runId)
        }

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
