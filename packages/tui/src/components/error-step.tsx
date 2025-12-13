import { Box, Text, useInput } from "ink"
import React from "react"

type ErrorStepProps = {
  message: string
  onBack: () => void
}

export function ErrorStep({ message, onBack }: ErrorStepProps) {
  useInput(() => onBack())
  return (
    <Box flexDirection="column">
      <Text color="red">Error: {message}</Text>
      <Box marginTop={1}>
        <Text dimColor>Press any key to go back</Text>
      </Box>
    </Box>
  )
}

export type { ErrorStepProps }
