import React, { useCallback } from "react"
import { KEY_HINTS, UI_CONSTANTS } from "../../constants.js"
import type { ExpertOption } from "../../types/index.js"
import { ExpertSelectorBase } from "../expert-selector-base.js"

export type BrowsingExpertsInputProps = {
  experts: ExpertOption[]
  onExpertSelect: (expertKey: string) => void
  onSwitchToHistory: () => void
}
export const BrowsingExpertsInput = ({
  experts,
  onExpertSelect,
  onSwitchToHistory,
}: BrowsingExpertsInputProps) => {
  const extraKeyHandler = useCallback(
    (inputChar: string) => {
      if (inputChar === "h") {
        onSwitchToHistory()
        return true
      }
      return false
    },
    [onSwitchToHistory],
  )
  const hint = `Experts ${KEY_HINTS.NAVIGATE} ${KEY_HINTS.SELECT} ${KEY_HINTS.INPUT} ${KEY_HINTS.HISTORY} ${KEY_HINTS.CANCEL}`
  return (
    <ExpertSelectorBase
      experts={experts}
      hint={hint}
      onExpertSelect={onExpertSelect}
      showSource
      maxItems={UI_CONSTANTS.MAX_VISIBLE_LIST_ITEMS}
      extraKeyHandler={extraKeyHandler}
    />
  )
}
