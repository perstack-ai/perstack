import { Box, Text, useApp, useInput } from "ink"
import React, { useState } from "react"
import type { WizardVersionInfo } from "../types/wizard.js"
import { getStatusColor } from "../utils/status-color.js"

export type VersionSelectorProps = {
  expertName: string
  versions: WizardVersionInfo[]
  onSelect: (version: WizardVersionInfo) => void
  onBack: () => void
  title?: string
}

export function VersionSelector({
  expertName,
  versions,
  onSelect,
  onBack,
  title,
}: VersionSelectorProps) {
  const { exit } = useApp()
  const [selectedIndex, setSelectedIndex] = useState(0)
  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : versions.length - 1))
    } else if (key.downArrow) {
      setSelectedIndex((prev) => (prev < versions.length - 1 ? prev + 1 : 0))
    } else if (key.return) {
      const version = versions[selectedIndex]
      if (version) {
        onSelect(version)
      }
    } else if (key.escape || key.backspace || key.delete) {
      onBack()
    } else if (input === "q") {
      exit()
    }
  })
  return (
    <Box flexDirection="column">
      <Text bold>{title ?? `Select a version of ${expertName}:`}</Text>
      <Box flexDirection="column" marginTop={1}>
        {versions.map((v, index) => (
          <Box key={v.key}>
            <Text color={index === selectedIndex ? "cyan" : undefined}>
              {index === selectedIndex ? "❯ " : "  "}
              {v.version}
              {v.tags.length > 0 && <Text color="magenta"> [{v.tags.join(", ")}]</Text>}
              <Text color={getStatusColor(v.status)}> {v.status}</Text>
            </Text>
          </Box>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>↑↓ navigate · enter select · esc back · q quit</Text>
      </Box>
    </Box>
  )
}
