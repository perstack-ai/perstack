import { Box, Text, useApp, useInput } from "ink"
import { useState } from "react"

type ExpertChoice = {
  name: string
  description?: string
}
type VersionInfo = {
  key: string
  version: string
  tags: string[]
  status: "available" | "deprecated" | "disabled"
}
type WizardStep =
  | { type: "selectExpert" }
  | { type: "loadingVersions"; expertName: string }
  | { type: "selectVersion"; expertName: string; versions: VersionInfo[] }
  | { type: "confirm"; expertKey: string; version: string }
  | { type: "error"; message: string }
type UnpublishWizardResult = {
  expertKey: string
}
type UnpublishAppProps = {
  experts: ExpertChoice[]
  onFetchVersions: (expertName: string) => Promise<VersionInfo[]>
  onComplete: (result: UnpublishWizardResult) => void
  onCancel: () => void
}
function ExpertSelector({
  experts,
  onSelect,
}: {
  experts: ExpertChoice[]
  onSelect: (name: string) => void
}) {
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
      <Text bold>Select an Expert to unpublish:</Text>
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
function VersionSelector({
  expertName,
  versions,
  onSelect,
  onBack,
}: {
  expertName: string
  versions: VersionInfo[]
  onSelect: (version: VersionInfo) => void
  onBack: () => void
}) {
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
  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "green"
      case "deprecated":
        return "yellow"
      case "disabled":
        return "red"
      default:
        return undefined
    }
  }
  return (
    <Box flexDirection="column">
      <Text bold>Select a version of {expertName} to unpublish:</Text>
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
function ConfirmStep({
  expertKey,
  version,
  onConfirm,
  onBack,
}: {
  expertKey: string
  version: string
  onConfirm: () => void
  onBack: () => void
}) {
  const { exit } = useApp()
  const [selectedIndex, setSelectedIndex] = useState(1)
  const options = ["Yes, unpublish", "Cancel"]
  useInput((input, key) => {
    if (key.upArrow || key.downArrow) {
      setSelectedIndex((prev) => (prev === 0 ? 1 : 0))
    } else if (key.return) {
      if (selectedIndex === 0) {
        onConfirm()
      } else {
        onBack()
      }
    } else if (key.escape) {
      onBack()
    } else if (input === "q") {
      exit()
    }
  })
  return (
    <Box flexDirection="column">
      <Text bold color="red">
        ⚠ Unpublish {expertKey}?
      </Text>
      <Box flexDirection="column" marginTop={1} marginLeft={2}>
        <Text>Version: {version}</Text>
        <Text color="yellow">This action is permanent and cannot be undone.</Text>
      </Box>
      <Box flexDirection="column" marginTop={1}>
        {options.map((option, index) => (
          <Text
            key={option}
            color={index === selectedIndex ? "cyan" : index === 0 ? "red" : undefined}
          >
            {index === selectedIndex ? "❯ " : "  "}
            {option}
          </Text>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>↑↓ navigate · enter select · esc back · q quit</Text>
      </Box>
    </Box>
  )
}
export function UnpublishApp({
  experts,
  onFetchVersions,
  onComplete,
  onCancel,
}: UnpublishAppProps) {
  const { exit } = useApp()
  const [step, setStep] = useState<WizardStep>({ type: "selectExpert" })
  const handleExpertSelect = async (expertName: string) => {
    setStep({ type: "loadingVersions", expertName })
    try {
      const versions = await onFetchVersions(expertName)
      if (versions.length === 0) {
        setStep({ type: "error", message: `No versions found for ${expertName}` })
        return
      }
      setStep({ type: "selectVersion", expertName, versions })
    } catch (error) {
      setStep({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to fetch versions",
      })
    }
  }
  const handleVersionSelect = (version: VersionInfo) => {
    setStep({
      type: "confirm",
      expertKey: version.key,
      version: version.version,
    })
  }
  const handleConfirm = () => {
    if (step.type === "confirm") {
      onComplete({ expertKey: step.expertKey })
      exit()
    }
  }
  const handleBack = () => {
    switch (step.type) {
      case "selectVersion":
        setStep({ type: "selectExpert" })
        break
      case "confirm":
        setStep({ type: "selectExpert" })
        break
      case "error":
        setStep({ type: "selectExpert" })
        break
      default:
        onCancel()
        exit()
    }
  }
  switch (step.type) {
    case "selectExpert":
      return <ExpertSelector experts={experts} onSelect={handleExpertSelect} />
    case "loadingVersions":
      return (
        <Box>
          <Text>Loading versions for {step.expertName}...</Text>
        </Box>
      )
    case "selectVersion":
      return (
        <VersionSelector
          expertName={step.expertName}
          versions={step.versions}
          onSelect={handleVersionSelect}
          onBack={handleBack}
        />
      )
    case "confirm":
      return (
        <ConfirmStep
          expertKey={step.expertKey}
          version={step.version}
          onConfirm={handleConfirm}
          onBack={handleBack}
        />
      )
    case "error":
      return (
        <Box flexDirection="column">
          <Text color="red">Error: {step.message}</Text>
          <Box marginTop={1}>
            <Text dimColor>Press any key to go back</Text>
          </Box>
        </Box>
      )
    default:
      return null
  }
}
export type { ExpertChoice, VersionInfo, UnpublishWizardResult }
