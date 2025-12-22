import { Box, Static, Text, useApp } from "ink"
import { useCallback, useEffect } from "react"
import { LogEntryRow } from "../components/index.js"
import { useEventStore } from "../hooks/state/use-event-store.js"
import type { PerstackEvent } from "../types/index.js"

type ProgressAppProps = {
  title?: string
  onReady: (addEvent: (event: PerstackEvent) => void) => void
  onExit?: () => void
}

export const ProgressApp = ({ title, onReady, onExit }: ProgressAppProps) => {
  const { exit } = useApp()
  const eventStore = useEventStore()
  useEffect(() => {
    onReady(eventStore.addEvent)
  }, [onReady, eventStore.addEvent])
  const handleExit = useCallback(() => {
    onExit?.()
    exit()
  }, [onExit, exit])
  useEffect(() => {
    if (eventStore.isComplete) {
      const timer = setTimeout(handleExit, 500)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [eventStore.isComplete, handleExit])
  return (
    <Box flexDirection="column">
      {title && (
        <Box marginBottom={1}>
          <Text bold color="cyan">
            {title}
          </Text>
        </Box>
      )}
      <Static items={eventStore.logs} style={{ flexDirection: "column", gap: 1, paddingBottom: 1 }}>
        {(entry) => <LogEntryRow key={entry.id} entry={entry} />}
      </Static>
      {eventStore.streamingReasoning && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color="cyan">● Reasoning</Text>
          <Text dimColor>└ {eventStore.streamingReasoning}</Text>
        </Box>
      )}
      {eventStore.streamingText && (
        <Box flexDirection="column">
          <Text color="green">● Run Results</Text>
          <Text dimColor>└ {eventStore.streamingText}</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text color="gray">Events: {eventStore.eventCount}</Text>
        {eventStore.isComplete && <Text color="green"> ✓ Complete</Text>}
      </Box>
    </Box>
  )
}
