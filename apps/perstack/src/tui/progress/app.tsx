import type { PerstackEvent } from "@perstack/core"
import { useLogStore } from "@perstack/react"
import { Box, Static, Text, useApp } from "ink"
import { useCallback, useEffect } from "react"
import { CheckpointActionRow, StreamingDisplay } from "../components/index.js"

type ProgressAppProps = {
  title?: string
  onReady: (addEvent: (event: PerstackEvent) => void) => void
  onExit?: () => void
}

/**
 * Progress app with proper Static/Streaming separation.
 *
 * Structure:
 * 1. <Static> - Completed actions only (never updates once rendered)
 * 2. StreamingDisplay - Active streaming content (reasoning, text)
 * 3. Status footer
 *
 * This architecture ensures that:
 * - Static content is truly static (no re-renders)
 * - Streaming content is ephemeral and only active during generation
 * - When streaming completes, content moves to Static via new entries
 */
export const ProgressApp = ({ title, onReady, onExit }: ProgressAppProps) => {
  const { exit } = useApp()
  const logStore = useLogStore()

  useEffect(() => {
    onReady(logStore.addEvent)
  }, [onReady, logStore.addEvent])

  const handleExit = useCallback(() => {
    onExit?.()
    exit()
  }, [onExit, exit])

  useEffect(() => {
    if (logStore.isComplete) {
      const timer = setTimeout(handleExit, 500)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [logStore.isComplete, handleExit])

  return (
    <Box flexDirection="column">
      {title && (
        <Box marginBottom={1}>
          <Text bold color="cyan">
            {title}
          </Text>
        </Box>
      )}

      {/* Static section - completed actions only */}
      <Static items={logStore.logs} style={{ flexDirection: "column", gap: 1, paddingBottom: 1 }}>
        {(entry) => <CheckpointActionRow key={entry.id} action={entry.action} />}
      </Static>

      {/* Streaming section - active streaming content */}
      <StreamingDisplay streaming={logStore.runtimeState.streaming} />

      {/* Status footer */}
      <Box marginTop={1}>
        <Text color="gray">Events: {logStore.eventCount}</Text>
        {logStore.isComplete && <Text color="green"> ✓ Complete</Text>}
      </Box>
    </Box>
  )
}
