import { Box, Text, useApp, useInput } from "ink"
import { type ReactNode, useEffect, useState } from "react"
import { getDefaultModel, type LLMInfo, type LLMProvider } from "./detect-llm.js"
import type { RuntimeInfo, RuntimeType } from "./detect-runtime.js"

type WizardStep =
  | "detecting"
  | "select-mode"
  | "select-llm"
  | "input-api-key"
  | "select-runtime"
  | "confirm"
  | "input-expert-description"
  | "done"

export interface WizardResult {
  mode: "perstack" | "runtime"
  provider?: LLMProvider
  model?: string
  apiKey?: string
  runtime?: RuntimeType
  expertDescription?: string
}

interface WizardProps {
  llms: LLMInfo[]
  runtimes: RuntimeInfo[]
  onComplete: (result: WizardResult) => void
  isImprovement?: boolean
  improvementTarget?: string
}

function SelectableList({
  items,
  selectedIndex,
  renderItem,
}: {
  items: { key: string; label: string; disabled?: boolean }[]
  selectedIndex: number
  renderItem?: (
    item: { key: string; label: string; disabled?: boolean },
    selected: boolean,
  ) => ReactNode
}) {
  return (
    <Box flexDirection="column">
      {items.map((item, index) => {
        const isSelected = index === selectedIndex
        if (renderItem) {
          return <Box key={item.key}>{renderItem(item, isSelected)}</Box>
        }
        return (
          <Box key={item.key}>
            <Text color={item.disabled ? "gray" : isSelected ? "cyan" : "white"}>
              {isSelected ? "❯ " : "  "}
              {item.label}
              {item.disabled ? " (not available)" : ""}
            </Text>
          </Box>
        )
      })}
    </Box>
  )
}

function TextInputComponent({
  value,
  onChange,
  onSubmit,
  placeholder,
  isSecret,
}: {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder?: string
  isSecret?: boolean
}) {
  useInput((input, key) => {
    if (key.return) {
      onSubmit()
    } else if (key.backspace || key.delete) {
      onChange(value.slice(0, -1))
    } else if (!key.ctrl && !key.meta && input) {
      onChange(value + input)
    }
  })
  const displayValue = isSecret ? "•".repeat(value.length) : value
  return (
    <Box>
      <Text color="cyan">{displayValue || <Text color="gray">{placeholder}</Text>}</Text>
      <Text color="cyan">█</Text>
    </Box>
  )
}

export function Wizard({
  llms,
  runtimes,
  onComplete,
  isImprovement,
  improvementTarget,
}: WizardProps) {
  const { exit } = useApp()
  const [step, setStep] = useState<WizardStep>("detecting")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [result, setResult] = useState<Partial<WizardResult>>({})
  const [apiKeyInput, setApiKeyInput] = useState("")
  const [expertDescInput, setExpertDescInput] = useState(improvementTarget || "")
  const availableLLMs = llms.filter((l) => l.available)
  const availableRuntimes = runtimes.filter((r) => r.available)
  useEffect(() => {
    if (step === "detecting") {
      const timer = setTimeout(() => {
        if (isImprovement) {
          const llm = availableLLMs[0]
          if (llm) {
            setResult({
              mode: "perstack",
              provider: llm.provider,
              model: getDefaultModel(llm.provider),
            })
            setStep("input-expert-description")
          } else {
            setStep("select-mode")
          }
        } else {
          setStep("select-mode")
        }
      }, 500)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [step, isImprovement, availableLLMs])
  useInput((_, key) => {
    if (key.escape) {
      exit()
      return
    }
    if (step === "input-api-key" || step === "input-expert-description") {
      return
    }
    if (key.upArrow) {
      setSelectedIndex((prev) => Math.max(0, prev - 1))
    } else if (key.downArrow) {
      setSelectedIndex((prev) => {
        const maxIndex = getMaxIndex()
        return Math.min(maxIndex, prev + 1)
      })
    } else if (key.return) {
      handleSelect()
    }
  })
  function getMaxIndex(): number {
    switch (step) {
      case "select-mode":
        return 1
      case "select-llm":
        return llms.length - 1
      case "select-runtime":
        return runtimes.length - 1
      case "confirm":
        return 1
      default:
        return 0
    }
  }
  function handleSelect() {
    switch (step) {
      case "select-mode":
        if (selectedIndex === 0) {
          setResult({ mode: "perstack" })
          if (availableLLMs.length > 0) {
            setStep("select-llm")
          } else {
            setStep("input-api-key")
          }
        } else {
          setResult({ mode: "runtime" })
          if (availableRuntimes.length > 0) {
            setStep("select-runtime")
          } else {
            exit()
          }
        }
        setSelectedIndex(0)
        break
      case "select-llm": {
        const selectedLLM = llms[selectedIndex]
        if (!selectedLLM) break
        if (selectedLLM.available) {
          setResult((prev) => ({
            ...prev,
            provider: selectedLLM.provider,
            model: getDefaultModel(selectedLLM.provider),
          }))
          setStep("confirm")
        } else {
          setResult((prev) => ({ ...prev, provider: selectedLLM.provider }))
          setStep("input-api-key")
        }
        setSelectedIndex(0)
        break
      }
      case "select-runtime": {
        const selectedRuntime = runtimes[selectedIndex]
        if (!selectedRuntime) break
        if (selectedRuntime.available) {
          setResult((prev) => ({ ...prev, runtime: selectedRuntime.type }))
          setStep("confirm")
        }
        setSelectedIndex(0)
        break
      }
      case "confirm":
        if (selectedIndex === 0) {
          setStep("input-expert-description")
        } else {
          setStep("select-mode")
          setResult({})
        }
        setSelectedIndex(0)
        break
    }
  }
  function handleApiKeySubmit() {
    if (apiKeyInput.trim()) {
      const provider = result.provider || "anthropic"
      setResult((prev) => ({
        ...prev,
        provider,
        model: getDefaultModel(provider),
        apiKey: apiKeyInput.trim(),
      }))
      setStep("confirm")
    }
  }
  function handleExpertDescSubmit() {
    if (expertDescInput.trim()) {
      const finalResult: WizardResult = {
        mode: result.mode || "perstack",
        provider: result.provider,
        model: result.model,
        apiKey: result.apiKey,
        runtime: result.runtime,
        expertDescription: expertDescInput.trim(),
      }
      onComplete(finalResult)
      setStep("done")
    }
  }
  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          🚀 Create Expert Wizard
        </Text>
      </Box>
      {step === "detecting" && (
        <Box>
          <Text color="yellow">Detecting available LLMs and runtimes...</Text>
        </Box>
      )}
      {step === "select-mode" && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text>How would you like to run your Expert?</Text>
          </Box>
          <Box marginBottom={1}>
            <Text color="gray">
              Available: {availableLLMs.length} LLM(s), {availableRuntimes.length} runtime(s)
            </Text>
          </Box>
          <SelectableList
            items={[
              {
                key: "perstack",
                label: `Perstack Runtime (built-in)${availableLLMs.length > 0 ? ` - ${availableLLMs.map((l) => l.displayName).join(", ")} available` : " - needs API key"}`,
              },
              {
                key: "runtime",
                label: `External Runtime${availableRuntimes.length > 0 ? ` - ${availableRuntimes.map((r) => r.type).join(", ")} available` : " - none available"}`,
                disabled: availableRuntimes.length === 0,
              },
            ]}
            selectedIndex={selectedIndex}
          />
          <Box marginTop={1}>
            <Text color="gray">↑↓ to move, Enter to select, Esc to exit</Text>
          </Box>
        </Box>
      )}
      {step === "select-llm" && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text>Select an LLM provider:</Text>
          </Box>
          <SelectableList
            items={llms.map((l) => ({
              key: l.provider,
              label: `${l.displayName}${l.available ? " ✓" : ""}`,
              disabled: false,
            }))}
            selectedIndex={selectedIndex}
          />
          <Box marginTop={1}>
            <Text color="gray">↑↓ to move, Enter to select</Text>
          </Box>
        </Box>
      )}
      {step === "input-api-key" && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text>Enter your {result.provider || "Anthropic"} API key:</Text>
          </Box>
          <TextInputComponent
            value={apiKeyInput}
            onChange={setApiKeyInput}
            onSubmit={handleApiKeySubmit}
            placeholder="sk-..."
            isSecret={true}
          />
          <Box marginTop={1}>
            <Text color="gray">Type your API key and press Enter</Text>
          </Box>
        </Box>
      )}
      {step === "select-runtime" && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text>Select a runtime:</Text>
          </Box>
          <SelectableList
            items={runtimes.map((r) => ({
              key: r.type,
              label: `${r.type}${r.available ? ` ✓ (${r.version || "installed"})` : ""}`,
              disabled: !r.available,
            }))}
            selectedIndex={selectedIndex}
          />
          <Box marginTop={1}>
            <Text color="gray">↑↓ to move, Enter to select</Text>
          </Box>
        </Box>
      )}
      {step === "confirm" && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text bold>Configuration Summary:</Text>
          </Box>
          <Box flexDirection="column" marginBottom={1}>
            <Text>
              • Mode: <Text color="cyan">{result.mode}</Text>
            </Text>
            {result.provider && (
              <Text>
                • Provider: <Text color="cyan">{result.provider}</Text>
              </Text>
            )}
            {result.model && (
              <Text>
                • Model: <Text color="cyan">{result.model}</Text>
              </Text>
            )}
            {result.runtime && (
              <Text>
                • Runtime: <Text color="cyan">{result.runtime}</Text>
              </Text>
            )}
          </Box>
          <SelectableList
            items={[
              { key: "continue", label: "Continue" },
              { key: "back", label: "Start over" },
            ]}
            selectedIndex={selectedIndex}
          />
        </Box>
      )}
      {step === "input-expert-description" && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text bold>
              {isImprovement
                ? "What improvements do you want?"
                : "What kind of Expert do you want to create?"}
            </Text>
          </Box>
          <Box marginBottom={1}>
            <Text color="gray">
              Describe the Expert's purpose, capabilities, or domain knowledge.
            </Text>
          </Box>
          <TextInputComponent
            value={expertDescInput}
            onChange={setExpertDescInput}
            onSubmit={handleExpertDescSubmit}
            placeholder="e.g., A code reviewer that checks for TypeScript best practices"
          />
          <Box marginTop={1}>
            <Text color="gray">Type your description and press Enter</Text>
          </Box>
        </Box>
      )}
      {step === "done" && (
        <Box>
          <Text color="green">✓ Configuration complete! Starting Expert creation...</Text>
        </Box>
      )}
    </Box>
  )
}
