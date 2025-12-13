import { Box, Text, useApp, useInput } from "ink"
import React, { useState } from "react"
import type { WizardExpertChoice } from "../types/wizard.js"

export type WizardExpertSelectorProps = {
  title: string
  experts: WizardExpertChoice[]
  onSelect: (name: string) => void
}
export function WizardExpertSelector({ title, experts, onSelect }: WizardExpertSelectorProps) {
  const { exit } = useApp()
  const [selectedIndex, setSelectedIndex] = useState(0)
  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : experts.length - 1))
    } else if (key.downArrow) {
      setSelectedIndex((prev) => (prev < experts.length - 1 ? prev + 1 : 0))
    } else if (key.return) {
      const expert = experts[selectedIndex]
      if (expert) {
        onSelect(expert.name)
      }
    } else if (input === "q" || key.escape) {
      exit()
    }
  })
  return (
    <Box flexDirection="column">
      <Text bold>{title}</Text>
      <Box flexDirection="column" marginTop={1}>
        {experts.map((expert, index) => (
          <Box key={expert.name}>
            <Text color={index === selectedIndex ? "cyan" : undefined}>
              {index === selectedIndex ? "❯ " : "  "}
              {expert.name}
              {expert.description && <Text dimColor> - {expert.description}</Text>}
            </Text>
          </Box>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>↑↓ navigate · enter select · q quit</Text>
      </Box>
    </Box>
  )
}
