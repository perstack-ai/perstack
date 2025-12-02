import type { Key } from "ink"
import { useCallback, useState } from "react"
import { useLatestRef } from "../core/use-latest-ref.js"

type UseTextInputOptions = {
  onSubmit: (value: string) => void
  onCancel?: () => void
}
export const useTextInput = (options: UseTextInputOptions) => {
  const [input, setInput] = useState("")
  const inputRef = useLatestRef(input)
  const onSubmitRef = useLatestRef(options.onSubmit)
  const onCancelRef = useLatestRef(options.onCancel)
  const handleInput = useCallback(
    (inputChar: string, key: Key): void => {
      if (key.escape) {
        setInput("")
        onCancelRef.current?.()
        return
      }
      if (key.return && inputRef.current.trim()) {
        onSubmitRef.current(inputRef.current.trim())
        setInput("")
        return
      }
      if (key.backspace || key.delete) {
        setInput((prev) => prev.slice(0, -1))
        return
      }
      if (!key.ctrl && !key.meta && inputChar) {
        setInput((prev) => prev + inputChar)
      }
    },
    [inputRef, onSubmitRef, onCancelRef],
  )
  const reset = useCallback(() => {
    setInput("")
  }, [])
  return { input, handleInput, reset }
}
