import { Box, Text } from "ink"
import type React from "react"
import type { StreamingState } from "../types/index.js"
import { ActionRow } from "./action-row.js"

type StreamingDisplayProps = {
  streaming: StreamingState
}

/**
 * Renders currently active streaming content.
 * This component is sandwiched between <Static> logs and input fields.
 * Content is only shown while actively streaming, and moves to <Static>
 * logs once complete.
 */
export const StreamingDisplay = ({ streaming }: StreamingDisplayProps): React.ReactNode => {
  const hasContent = streaming.isReasoningActive || streaming.isRunResultActive

  if (!hasContent) return null

  return (
    <Box flexDirection="column" marginY={1}>
      {streaming.isReasoningActive && streaming.reasoning && (
        <StreamingReasoning text={streaming.reasoning} />
      )}
      {streaming.isRunResultActive && streaming.runResult && (
        <StreamingRunResult text={streaming.runResult} />
      )}
    </Box>
  )
}

function StreamingReasoning({ text }: { text: string }): React.ReactNode {
  const lines = text.split("\n")
  return (
    <ActionRow indicatorColor="cyan" label="Reasoning...">
      <Box flexDirection="column">
        {lines.map((line, idx) => (
          <Text key={`streaming-reasoning-${idx}`} dimColor wrap="wrap">
            {line}
          </Text>
        ))}
      </Box>
    </ActionRow>
  )
}

function StreamingRunResult({ text }: { text: string }): React.ReactNode {
  const lines = text.split("\n")
  return (
    <ActionRow indicatorColor="green" label="Generating...">
      <Box flexDirection="column">
        {lines.map((line, idx) => (
          <Text key={`streaming-run-result-${idx}`} wrap="wrap">
            {line}
          </Text>
        ))}
      </Box>
    </ActionRow>
  )
}
