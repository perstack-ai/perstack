import { Box, Text, useApp, useInput } from "ink"
import { useState } from "react"
import { ErrorStep } from "../../src/components/error-step.js"
import type { WizardExpertChoice, WizardVersionInfo } from "../../src/types/wizard.js"
import { getStatusColor } from "../../src/utils/index.js"

type WizardStep =
  | { type: "selectExpert" }
  | { type: "loadingVersions"; expertName: string }
  | { type: "selectVersion"; expertName: string; versions: WizardVersionInfo[] }
  | { type: "selectStatus"; expertKey: string; currentStatus: string }
  | { type: "confirm"; expertKey: string; status: string; currentStatus: string }
  | { type: "error"; message: string }

type StatusWizardResult = {
  expertKey: string
  status: "available" | "deprecated" | "disabled"
}

type StatusAppProps = {
  experts: WizardExpertChoice[]
  onFetchVersions: (expertName: string) => Promise<WizardVersionInfo[]>
  onComplete: (result: StatusWizardResult) => void
  onCancel: () => void
}

function getAvailableStatusTransitions(currentStatus: string): string[] {
  switch (currentStatus) {
    case "available":
      return ["available", "deprecated", "disabled"]
    case "deprecated":
      return ["deprecated", "disabled"]
    case "disabled":
      return ["disabled"]
    default:
      return [currentStatus]
  }
}

function ExpertSelector({
  experts,
  onSelect,
}: {
  experts: WizardExpertChoice[]
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
      <Text bold>Select an Expert to change status:</Text>
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
  versions: WizardVersionInfo[]
  onSelect: (version: WizardVersionInfo) => void
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
  return (
    <Box flexDirection="column">
      <Text bold>Select a version of {expertName}:</Text>
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

function StatusSelector({
  expertKey,
  currentStatus,
  onSelect,
  onBack,
}: {
  expertKey: string
  currentStatus: string
  onSelect: (status: string) => void
  onBack: () => void
}) {
  const { exit } = useApp()
  const availableStatuses = getAvailableStatusTransitions(currentStatus)
  const [selectedIndex, setSelectedIndex] = useState(0)
  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : availableStatuses.length - 1))
    } else if (key.downArrow) {
      setSelectedIndex((prev) => (prev < availableStatuses.length - 1 ? prev + 1 : 0))
    } else if (key.return) {
      const status = availableStatuses[selectedIndex]
      if (status) {
        onSelect(status)
      }
    } else if (key.escape) {
      onBack()
    } else if (input === "q") {
      exit()
    }
  })
  return (
    <Box flexDirection="column">
      <Text bold>Select status for {expertKey}:</Text>
      <Text dimColor>Current: {currentStatus}</Text>
      <Box flexDirection="column" marginTop={1}>
        {availableStatuses.map((status, index) => (
          <Box key={status}>
            <Text color={index === selectedIndex ? "cyan" : getStatusColor(status)}>
              {index === selectedIndex ? "❯ " : "  "}
              {status}
              {status === currentStatus && <Text dimColor> (current)</Text>}
            </Text>
          </Box>
        ))}
      </Box>
      {currentStatus === "disabled" && (
        <Box marginTop={1}>
          <Text color="yellow">⚠ disabled status cannot be changed</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text dimColor>↑↓ navigate · enter select · esc back · q quit</Text>
      </Box>
    </Box>
  )
}

function ConfirmStep({
  expertKey,
  status,
  currentStatus,
  onConfirm,
  onBack,
}: {
  expertKey: string
  status: string
  currentStatus: string
  onConfirm: () => void
  onBack: () => void
}) {
  const { exit } = useApp()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const options = ["Confirm", "Cancel"]
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
  const statusChanged = status !== currentStatus
  return (
    <Box flexDirection="column">
      <Text bold>Confirm status change for {expertKey}:</Text>
      <Box flexDirection="column" marginTop={1} marginLeft={2}>
        {statusChanged ? (
          <Text>
            Status: <Text color={getStatusColor(currentStatus)}>{currentStatus}</Text>
            <Text> → </Text>
            <Text color={getStatusColor(status)}>{status}</Text>
          </Text>
        ) : (
          <Text>
            Status: <Text color={getStatusColor(status)}>{status}</Text>
            <Text dimColor> (unchanged)</Text>
          </Text>
        )}
      </Box>
      <Box flexDirection="column" marginTop={1}>
        {options.map((option, index) => (
          <Text key={option} color={index === selectedIndex ? "cyan" : undefined}>
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

export function StatusApp({ experts, onFetchVersions, onComplete, onCancel }: StatusAppProps) {
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
  const handleVersionSelect = (version: WizardVersionInfo) => {
    setStep({
      type: "selectStatus",
      expertKey: version.key,
      currentStatus: version.status,
    })
  }
  const handleStatusSelect = (status: string) => {
    if (step.type === "selectStatus") {
      setStep({
        type: "confirm",
        expertKey: step.expertKey,
        status,
        currentStatus: step.currentStatus,
      })
    }
  }
  const handleConfirm = () => {
    if (step.type === "confirm") {
      onComplete({
        expertKey: step.expertKey,
        status: step.status as "available" | "deprecated" | "disabled",
      })
      exit()
    }
  }
  const handleBack = () => {
    switch (step.type) {
      case "selectVersion":
        setStep({ type: "selectExpert" })
        break
      case "selectStatus":
        setStep({ type: "selectExpert" })
        break
      case "confirm":
        setStep({
          type: "selectStatus",
          expertKey: step.expertKey,
          currentStatus: step.currentStatus,
        })
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
    case "selectStatus":
      return (
        <StatusSelector
          expertKey={step.expertKey}
          currentStatus={step.currentStatus}
          onSelect={handleStatusSelect}
          onBack={handleBack}
        />
      )
    case "confirm":
      return (
        <ConfirmStep
          expertKey={step.expertKey}
          status={step.status}
          currentStatus={step.currentStatus}
          onConfirm={handleConfirm}
          onBack={handleBack}
        />
      )
    case "error":
      return <ErrorStep message={step.message} onBack={handleBack} />
    default:
      return null
  }
}

export type { StatusWizardResult }
export type { WizardExpertChoice, WizardVersionInfo } from "../../src/types/wizard.js"
