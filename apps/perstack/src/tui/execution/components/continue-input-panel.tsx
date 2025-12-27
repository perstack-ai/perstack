import { Box, Text, useInput } from "ink"
import type React from "react"
import { useTextInput } from "../../hooks/index.js"
import type { RunStatus } from "../hooks/index.js"

type ContinueInputPanelProps = {
  isActive: boolean
  runStatus: RunStatus
  onSubmit: (query: string) => void
}

export const ContinueInputPanel = ({
  isActive,
  runStatus,
  onSubmit,
}: ContinueInputPanelProps): React.ReactNode => {
  const { input, handleInput } = useTextInput({
    onSubmit: (newQuery) => {
      if (isActive && newQuery.trim()) {
        onSubmit(newQuery.trim())
      }
    },
  })

  useInput(handleInput, { isActive })

  if (runStatus === "running") {
    return null
  }

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray">
      <Text>
        <Text color={runStatus === "completed" ? "green" : "yellow"} bold>
          {runStatus === "completed" ? "Completed" : "Stopped"}
        </Text>
        <Text color="gray"> - Enter a follow-up query or wait to exit</Text>
      </Text>
      <Box>
        <Text color="gray">Continue: </Text>
        <Text>{input}</Text>
        <Text color="cyan">_</Text>
      </Box>
    </Box>
  )
}
