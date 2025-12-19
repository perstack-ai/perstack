import type { Key } from "ink"
import { useCallback, useState } from "react"
import type { ExpertOption } from "../../types/index.js"
import { useTextInput } from "../state/use-text-input.js"
import { useListNavigation } from "./use-list-navigation.js"

type UseExpertSelectorOptions = {
  experts: ExpertOption[]
  onExpertSelect: (expertKey: string) => void
  extraKeyHandler?: (inputChar: string, key: Key) => boolean
}
export const useExpertSelector = (options: UseExpertSelectorOptions) => {
  const { experts, onExpertSelect, extraKeyHandler } = options
  const [inputMode, setInputMode] = useState(false)
  const { selectedIndex, handleNavigation } = useListNavigation({
    items: experts,
    onSelect: (expert) => onExpertSelect(expert.key),
  })
  const { input, handleInput, reset } = useTextInput({
    onSubmit: (value) => {
      onExpertSelect(value)
      setInputMode(false)
    },
    onCancel: () => setInputMode(false),
  })
  const handleKeyInput = useCallback(
    (inputChar: string, key: Key) => {
      if (inputMode) {
        handleInput(inputChar, key)
        return
      }
      if (handleNavigation(inputChar, key)) return
      if (extraKeyHandler?.(inputChar, key)) return
      if (inputChar === "i") {
        reset()
        setInputMode(true)
      }
    },
    [inputMode, handleInput, handleNavigation, extraKeyHandler, reset],
  )
  return {
    inputMode,
    input,
    selectedIndex,
    handleKeyInput,
  }
}
