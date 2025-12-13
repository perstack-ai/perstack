import { Box, Text, useApp, useInput } from "ink"
import React, { useState } from "react"
import { ErrorStep, VersionSelector, WizardExpertSelector } from "../../src/components/index.js"
import { KEY_HINTS } from "../../src/constants.js"
import type { WizardExpertChoice, WizardVersionInfo } from "../../src/types/wizard.js"

type WizardStep =
  | { type: "selectExpert" }
  | { type: "loadingVersions"; expertName: string }
  | { type: "selectVersion"; expertName: string; versions: WizardVersionInfo[] }
  | { type: "inputTags"; expertKey: string; currentTags: string[] }
  | { type: "confirm"; expertKey: string; tags: string[]; currentTags: string[] }
  | { type: "error"; message: string }
type TagWizardResult = {
  expertKey: string
  tags: string[]
}
type TagAppProps = {
  experts: WizardExpertChoice[]
  onFetchVersions: (expertName: string) => Promise<WizardVersionInfo[]>
  onComplete: (result: TagWizardResult) => void
  onCancel: () => void
}

function TagInput({
  expertKey,
  currentTags,
  onSubmit,
  onBack,
}: {
  expertKey: string
  currentTags: string[]
  onSubmit: (tags: string[]) => void
  onBack: () => void
}) {
  const { exit } = useApp()
  const customTags = currentTags.filter((t) => t !== "latest")
  const [input, setInput] = useState(customTags.join(", "))
  const [warning, setWarning] = useState("")
  useInput((char, key) => {
    if (key.return) {
      const rawTags = input
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
      const hasLatest = rawTags.includes("latest")
      const tags = rawTags.filter((t) => t !== "latest")
      if (hasLatest) {
        setWarning("'latest' tag is managed automatically and was removed")
        setInput(tags.join(", "))
        return
      }
      setWarning("")
      onSubmit(tags)
    } else if (key.escape) {
      onBack()
    } else if (key.backspace || key.delete) {
      setInput((prev) => prev.slice(0, -1))
      setWarning("")
    } else if (char === "q" && key.ctrl) {
      exit()
    } else if (char && !key.ctrl && !key.meta) {
      setInput((prev) => prev + char)
      setWarning("")
    }
  })
  const hasLatestInCurrent = currentTags.includes("latest")
  return (
    <Box flexDirection="column">
      <Text bold>Enter tags for {expertKey}:</Text>
      <Text dimColor>
        Current: {customTags.length > 0 ? customTags.join(", ") : "(none)"}
        {hasLatestInCurrent && <Text color="magenta"> [latest - auto-managed]</Text>}
      </Text>
      <Box marginTop={1}>
        <Text>Tags: </Text>
        <Text color="cyan">{input}</Text>
        <Text color="gray">│</Text>
      </Box>
      {warning && (
        <Box marginTop={1}>
          <Text color="yellow">⚠ {warning}</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text dimColor>
          comma-separated {KEY_HINTS.CONFIRM} {KEY_HINTS.ESC_BACK} {KEY_HINTS.CTRL_QUIT}
        </Text>
      </Box>
    </Box>
  )
}

function ConfirmStep({
  expertKey,
  tags,
  currentTags,
  onConfirm,
  onBack,
}: {
  expertKey: string
  tags: string[]
  currentTags: string[]
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
  const customCurrentTags = currentTags.filter((t) => t !== "latest")
  const tagsChanged =
    tags.length !== customCurrentTags.length ||
    [...tags].sort().join(",") !== [...customCurrentTags].sort().join(",")
  return (
    <Box flexDirection="column">
      <Text bold>Confirm update for {expertKey}:</Text>
      <Box flexDirection="column" marginTop={1} marginLeft={2}>
        {tagsChanged ? (
          <Text>
            Tags: <Text color="yellow">{customCurrentTags.join(", ") || "(none)"}</Text>
            <Text> → </Text>
            <Text color="cyan">{tags.join(", ") || "(none)"}</Text>
          </Text>
        ) : (
          <Text>
            Tags: <Text color="cyan">{tags.join(", ") || "(none)"}</Text>
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
        <Text dimColor>
          {KEY_HINTS.NAVIGATE} {KEY_HINTS.SELECT} {KEY_HINTS.ESC_BACK} {KEY_HINTS.QUIT}
        </Text>
      </Box>
    </Box>
  )
}

export function TagApp({ experts, onFetchVersions, onComplete, onCancel }: TagAppProps) {
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
      type: "inputTags",
      expertKey: version.key,
      currentTags: version.tags,
    })
  }
  const handleTagsSubmit = (tags: string[]) => {
    if (step.type === "inputTags") {
      setStep({
        type: "confirm",
        expertKey: step.expertKey,
        tags,
        currentTags: step.currentTags,
      })
    }
  }
  const handleConfirm = () => {
    if (step.type === "confirm") {
      onComplete({
        expertKey: step.expertKey,
        tags: step.tags,
      })
      exit()
    }
  }
  const handleBack = () => {
    switch (step.type) {
      case "selectVersion":
        setStep({ type: "selectExpert" })
        break
      case "inputTags":
        setStep({ type: "selectExpert" })
        break
      case "confirm":
        setStep({
          type: "inputTags",
          expertKey: step.expertKey,
          currentTags: step.currentTags,
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
      return (
        <WizardExpertSelector
          title="Select an Expert to tag:"
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
        />
      )
    case "inputTags":
      return (
        <TagInput
          expertKey={step.expertKey}
          currentTags={step.currentTags}
          onSubmit={handleTagsSubmit}
          onBack={handleBack}
        />
      )
    case "confirm":
      return (
        <ConfirmStep
          expertKey={step.expertKey}
          tags={step.tags}
          currentTags={step.currentTags}
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

export type { TagWizardResult }
export type { WizardExpertChoice, WizardVersionInfo } from "../../src/types/wizard.js"
