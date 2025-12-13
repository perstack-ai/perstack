import type { Key } from "ink"
import { Box, Text, useInput } from "ink"
import React from "react"
import { UI_CONSTANTS } from "../constants.js"
import { useExpertSelector } from "../hooks/index.js"
import type { ExpertOption } from "../types/index.js"
import { ExpertList } from "./expert-list.js"

export type ExpertSelectorBaseProps = {
  experts: ExpertOption[]
  hint: string
  onExpertSelect: (expertKey: string) => void
  showSource?: boolean
  inline?: boolean
  maxItems?: number
  extraKeyHandler?: (inputChar: string, key: Key) => boolean
}
export const ExpertSelectorBase = ({
  experts,
  hint,
  onExpertSelect,
  showSource = false,
  inline = false,
  maxItems = UI_CONSTANTS.MAX_VISIBLE_LIST_ITEMS,
  extraKeyHandler,
}: ExpertSelectorBaseProps) => {
  const { inputMode, input, selectedIndex, handleKeyInput } = useExpertSelector({
    experts,
    onExpertSelect,
    extraKeyHandler,
  })
  useInput(handleKeyInput)
  return (
    <Box flexDirection={inline ? "row" : "column"}>
      {!inputMode && (
        <Box flexDirection="column">
          <Box>
            <Text color="cyan">{hint}</Text>
          </Box>
          <ExpertList
            experts={experts}
            selectedIndex={selectedIndex}
            showSource={showSource}
            inline={inline}
            maxItems={maxItems}
          />
        </Box>
      )}
      {inputMode && (
        <Box>
          <Text color="gray">Expert: </Text>
          <Text color="white">{input}</Text>
          <Text color="cyan">_</Text>
        </Box>
      )}
    </Box>
  )
}
