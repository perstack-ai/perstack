import { useCallback, useMemo } from "react"
import type { ExpertOption, InputState } from "../../types/index.js"
import type { InputAction } from "../state/use-input-state.js"

type UseExpertActionsOptions = {
  needsQueryInput: boolean
  inputState: InputState
  dispatch: React.Dispatch<InputAction>
  setExpertName: (name: string) => void
  onComplete: (expertKey: string, query: string) => void
  markAsStarted: () => void
  configuredExperts: ExpertOption[]
  recentExperts: ExpertOption[]
}
export const useExpertActions = (options: UseExpertActionsOptions) => {
  const {
    needsQueryInput,
    inputState,
    dispatch,
    setExpertName,
    onComplete,
    markAsStarted,
    configuredExperts,
    recentExperts,
  } = options
  const allExperts = useMemo(() => {
    const configured = configuredExperts.map((e) => ({
      ...e,
      source: "configured" as const,
    }))
    const recent = recentExperts
      .filter((e) => !configured.some((c) => c.key === e.key))
      .map((e) => ({ ...e, source: "recent" as const }))
    return [...configured, ...recent]
  }, [configuredExperts, recentExperts])
  const handleExpertSelect = useCallback(
    (expertKey: string) => {
      setExpertName(expertKey)
      const needsQuery = needsQueryInput || inputState.type === "browsingExperts"
      dispatch({ type: "SELECT_EXPERT", expertKey, needsQuery })
      if (!needsQuery) {
        markAsStarted()
        onComplete(expertKey, "")
      }
    },
    [needsQueryInput, inputState.type, dispatch, setExpertName, onComplete, markAsStarted],
  )
  return { allExperts, handleExpertSelect }
}
