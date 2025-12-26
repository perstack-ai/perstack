import type { RunGroup } from "@perstack/react"
import { Box, Static, Text } from "ink"
import type React from "react"
import { CheckpointActionRow } from "./checkpoint-action-row.js"

type RunGroupStaticProps = {
  group: RunGroup
  showHeader?: boolean
}

/**
 * Renders a single run group in its own <Static> section.
 *
 * Each run gets its own visual grouping with:
 * - Optional header showing expert name and delegation info
 * - All log entries for that run
 */
export const RunGroupStatic = ({
  group,
  showHeader = true,
}: RunGroupStaticProps): React.ReactNode => {
  const { entries, expertKey, delegatedBy } = group

  if (entries.length === 0) return null

  return (
    <Box flexDirection="column">
      {showHeader && delegatedBy && (
        <Box marginTop={1}>
          <Text dimColor>
            ┌─ {expertKey} (delegated from {delegatedBy.expertKey})
          </Text>
        </Box>
      )}
      <Static items={entries}>
        {(entry) => <CheckpointActionRow key={entry.id} action={entry.action} />}
      </Static>
      {showHeader && delegatedBy && (
        <Box>
          <Text dimColor>└─ end {expertKey}</Text>
        </Box>
      )}
    </Box>
  )
}

