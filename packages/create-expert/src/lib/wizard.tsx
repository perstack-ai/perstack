import { Box, Text, useApp, useInput } from "ink"
import { type ReactNode, useEffect, useState } from "react"
import { getDefaultModel, type LLMInfo, type LLMProvider } from "./detect-llm.js"
import type { RuntimeInfo, RuntimeType } from "./detect-runtime.js"

type WizardStep =
  | "detecting"
  | "select-runtime"
  | "select-llm"
  | "select-provider"
  | "input-api-key"
  | "input-expert-description"
  | "done"

export interface WizardResult {
  runtime: "default" | RuntimeType
  provider?: LLMProvider
  model?: string
  apiKey?: string
  expertDescription?: string
}

interface WizardProps {
  llms: LLMInfo[]
  runtimes: RuntimeInfo[]
  onComplete: (result: WizardResult) => void
  isImprovement?: boolean
  improvementTarget?: string
}

interface RuntimeOption {
  key: string
  type: "default" | RuntimeType
  label: string
  version?: string
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

function getRuntimeDisplayName(type: RuntimeType): string {
  switch (type) {
    case "cursor":
      return "Cursor"
    case "claude-code":
      return "Claude Code"
    case "gemini":
      return "Gemini CLI"
  }
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
  const runtimeOptions: RuntimeOption[] = [
    { key: "default", type: "default", label: "Default (built-in)" },
    ...availableRuntimes.map((r) => ({
      key: r.type,
      type: r.type,
      label: `${getRuntimeDisplayName(r.type)}${r.version ? ` (${r.version})` : ""}`,
      version: r.version,
    })),
  ]
  const llmOptionsWithOther = [
    ...llms.map((l) => ({
      key: l.provider,
      label: `${l.displayName}${l.available ? " ✓" : ""}`,
      provider: l.provider,
      available: l.available,
    })),
    { key: "other", label: "Other (configure new provider)", provider: null, available: false },
  ]
  useEffect(() => {
    if (step === "detecting") {
      const timer = setTimeout(() => {
        if (isImprovement) {
          const llm = availableLLMs[0]
          if (llm) {
            setResult({
              runtime: "default",
              provider: llm.provider,
              model: getDefaultModel(llm.provider),
            })
            setStep("input-expert-description")
          } else {
            setStep("select-runtime")
          }
        } else {
          setStep("select-runtime")
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
      case "select-runtime":
        return runtimeOptions.length - 1
      case "select-llm":
        return llmOptionsWithOther.length - 1
      case "select-provider":
        return llms.length - 1
      default:
        return 0
    }
  }
  function handleSelect() {
    switch (step) {
      case "select-runtime": {
        const selected = runtimeOptions[selectedIndex]
        if (!selected) break
        if (selected.type === "default") {
          setResult({ runtime: "default" })
          if (availableLLMs.length > 0) {
            setStep("select-llm")
          } else {
            setStep("select-provider")
          }
        } else {
          setResult({ runtime: selected.type })
          setStep("input-expert-description")
        }
        setSelectedIndex(0)
        break
      }
      case "select-llm": {
        const selected = llmOptionsWithOther[selectedIndex]
        if (!selected) break
        if (selected.key === "other") {
          setStep("select-provider")
        } else if (selected.available && selected.provider) {
          setResult((prev) => ({
            ...prev,
            provider: selected.provider,
            model: getDefaultModel(selected.provider),
          }))
          setStep("input-expert-description")
        } else if (selected.provider) {
          setResult((prev) => ({ ...prev, provider: selected.provider }))
          setStep("input-api-key")
        }
        setSelectedIndex(0)
        break
      }
      case "select-provider": {
        const selected = llms[selectedIndex]
        if (!selected) break
        setResult((prev) => ({ ...prev, provider: selected.provider }))
        setStep("input-api-key")
        setSelectedIndex(0)
        break
      }
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
      setStep("input-expert-description")
    }
  }
  function handleExpertDescSubmit() {
    if (expertDescInput.trim()) {
      const finalResult: WizardResult = {
        runtime: result.runtime || "default",
        provider: result.provider,
        model: result.model,
        apiKey: result.apiKey,
        expertDescription: expertDescInput.trim(),
      }
      onComplete(finalResult)
      setStep("done")
      exit()
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
          <Text color="yellow">Detecting available runtimes...</Text>
        </Box>
      )}
      {step === "select-runtime" && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text>Select a runtime:</Text>
          </Box>
          <SelectableList
            items={runtimeOptions.map((r) => ({ key: r.key, label: r.label }))}
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
            items={llmOptionsWithOther.map((l) => ({ key: l.key, label: l.label }))}
            selectedIndex={selectedIndex}
          />
          <Box marginTop={1}>
            <Text color="gray">↑↓ to move, Enter to select</Text>
          </Box>
        </Box>
      )}
      {step === "select-provider" && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text color="yellow">⚠ No LLM API keys found.</Text>
          </Box>
          <Box marginBottom={1}>
            <Text>Perstack requires an API key from one of these providers:</Text>
          </Box>
          <Box flexDirection="column" marginBottom={1}>
            {llms.map((l) => (
              <Text key={l.provider} color="gray">
                • {l.displayName} ({l.envVar})
              </Text>
            ))}
          </Box>
          <Box marginBottom={1}>
            <Text>Select a provider to configure:</Text>
          </Box>
          <SelectableList
            items={llms.map((l) => ({ key: l.provider, label: l.displayName }))}
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
            <Text>
              Enter your {llms.find((l) => l.provider === result.provider)?.displayName || "API"}{" "}
              key:
            </Text>
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
