import { Box, Text, useInput } from "ink"
import React from "react"
import { KEY_HINTS } from "../../constants.js"
import { formatTimestamp } from "../../helpers.js"
import type { EventHistoryItem } from "../../types/index.js"

export type BrowsingEventDetailInputProps = {
  event: EventHistoryItem
  onBack: () => void
}
export const BrowsingEventDetailInput = ({ event, onBack }: BrowsingEventDetailInputProps) => {
  useInput((input, key) => {
    if (input === "b" || key.escape) {
      onBack()
    }
  })
  return (
    <Box flexDirection="column" paddingX={1}>
      <Box marginBottom={1}>
        <Text bold>Event Detail</Text>
        <Text dimColor> {KEY_HINTS.BACK}</Text>
      </Box>
      <Box flexDirection="column" marginLeft={2}>
        <Text>
          <Text color="gray">Type: </Text>
          <Text color="cyan">{event.type}</Text>
        </Text>
        <Text>
          <Text color="gray">Step: </Text>
          <Text>{event.stepNumber}</Text>
        </Text>
        <Text>
          <Text color="gray">Timestamp: </Text>
          <Text>{formatTimestamp(event.timestamp)}</Text>
        </Text>
        <Text>
          <Text color="gray">ID: </Text>
          <Text dimColor>{event.id}</Text>
        </Text>
        <Text>
          <Text color="gray">Run ID: </Text>
          <Text dimColor>{event.runId}</Text>
        </Text>
      </Box>
    </Box>
  )
}
