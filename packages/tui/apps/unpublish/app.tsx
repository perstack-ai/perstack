import { Box, Text, useApp, useInput } from "ink"
import React, { useState } from "react"
import { ErrorStep, VersionSelector, WizardExpertSelector } from "../../src/components/index.js"
import { KEY_HINTS } from "../../src/constants.js"
import type { WizardExpertChoice, WizardVersionInfo } from "../../src/types/wizard.js"

type WizardStep =
  | { type: "selectExpert" }
  | { type: "loadingVersions"; expertName: string }
  | { type: "selectVersion"; expertName: string; versions: WizardVersionInfo[] }
  | { type: "confirm"; expertKey: string; version: string }
  | { type: "error"; message: string }
type UnpublishWizardResult = {
  expertKey: string
}
type UnpublishAppProps = {
  experts: WizardExpertChoice[]
  onFetchVersions: (expertName: string) => Promise<WizardVersionInfo[]>
  onComplete: (result: UnpublishWizardResult) => void
  onCancel: () => void
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
        <Text dimColor>
          {KEY_HINTS.NAVIGATE} {KEY_HINTS.SELECT} {KEY_HINTS.ESC_BACK} {KEY_HINTS.QUIT}
        </Text>
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
  const handleVersionSelect = (version: WizardVersionInfo) => {
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
      return (
        <WizardExpertSelector
          title="Select an Expert to unpublish:"
          experts={experts}
          onSelect={handleExpertSelect}
        />
      )
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
          title={`Select a version of ${step.expertName} to unpublish:`}
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
      return <ErrorStep message={step.message} onBack={handleBack} />
    default:
      return null
  }
}
export type { UnpublishWizardResult }
export type { WizardExpertChoice, WizardVersionInfo } from "../../src/types/wizard.js"
