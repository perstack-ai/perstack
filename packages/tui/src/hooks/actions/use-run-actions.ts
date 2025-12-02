import { useCallback, useEffect, useState } from "react"
import type { EventResult, PerstackEvent } from "../../types/index.js"
import { useLatestRef } from "../core/use-latest-ref.js"
import type { InputAction } from "../state/use-input-state.js"

type UseRunActionsOptions = {
  expertName?: string
  dispatch: React.Dispatch<InputAction>
  setQuery: (query: string) => void
  onComplete: (expertKey: string, query: string) => void
  onContinue?: (query: string) => void
  onReady: (addEvent: (event: PerstackEvent) => void) => void
  stepStoreAddEvent: (event: PerstackEvent) => void
  handleEvent: (event: PerstackEvent) => EventResult | null
}
export const useRunActions = (options: UseRunActionsOptions) => {
  const {
    expertName,
    dispatch,
    setQuery,
    onComplete,
    onContinue,
    onReady,
    stepStoreAddEvent,
    handleEvent,
  } = options
  const [hasStarted, setHasStarted] = useState(false)
  const markAsStarted = useCallback(() => setHasStarted(true), [])
  const expertNameRef = useLatestRef(expertName)
  const onContinueRef = useLatestRef(onContinue)
  useEffect(() => {
    onReady((event: PerstackEvent) => {
      stepStoreAddEvent(event)
      const result = handleEvent(event)
      if (result?.initialized) {
        dispatch({ type: "INITIALIZE_RUNTIME" })
      } else if (result?.completed && onContinueRef.current) {
        dispatch({ type: "END_RUN", expertName: expertNameRef.current || "", reason: "completed" })
      } else if (result?.stopped && onContinueRef.current) {
        dispatch({ type: "END_RUN", expertName: expertNameRef.current || "", reason: "stopped" })
      }
    })
  }, [onReady, stepStoreAddEvent, handleEvent, dispatch, onContinueRef, expertNameRef])
  const handleQuerySubmit = useCallback(
    (query: string) => {
      setQuery(query)
      dispatch({ type: "START_RUN" })
      if (hasStarted && onContinue) {
        onContinue(query)
      } else {
        markAsStarted()
        onComplete(expertName || "", query)
      }
    },
    [hasStarted, onContinue, onComplete, expertName, setQuery, dispatch, markAsStarted],
  )
  return { hasStarted, markAsStarted, handleQuerySubmit }
}
