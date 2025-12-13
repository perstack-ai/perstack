import React, { useCallback } from "react"
import { useInputAreaContext } from "../context/index.js"
import { assertNever } from "../helpers.js"
import type { EventHistoryItem, InputState } from "../types/index.js"
import {
  BrowsingCheckpointsInput,
  BrowsingEventDetailInput,
  BrowsingEventsInput,
  BrowsingExpertsInput,
  BrowsingHistoryInput,
} from "./input-areas/index.js"

type BrowsingState = Exclude<InputState, { type: "enteringQuery" } | { type: "running" }>
type BrowserRouterProps = {
  inputState: BrowsingState
}
export const BrowserRouter = ({ inputState }: BrowserRouterProps) => {
  const ctx = useInputAreaContext()
  const handleEventSelect = useCallback(
    (event: EventHistoryItem) => {
      if (inputState.type === "browsingEvents") {
        ctx.onEventSelect(inputState, event)
      }
    },
    [ctx.onEventSelect, inputState],
  )
  switch (inputState.type) {
    case "browsingHistory":
      return (
        <BrowsingHistoryInput
          jobs={inputState.jobs}
          onJobSelect={ctx.onJobSelect}
          onJobResume={ctx.onJobResume}
          onSwitchToExperts={ctx.onSwitchToExperts}
        />
      )
    case "browsingExperts":
      return (
        <BrowsingExpertsInput
          experts={inputState.experts}
          onExpertSelect={ctx.onExpertSelect}
          onSwitchToHistory={ctx.onSwitchToHistory}
        />
      )
    case "browsingCheckpoints":
      return (
        <BrowsingCheckpointsInput
          job={inputState.job}
          checkpoints={inputState.checkpoints}
          onCheckpointSelect={ctx.onCheckpointSelect}
          onCheckpointResume={ctx.onCheckpointResume}
          onBack={ctx.onBack}
        />
      )
    case "browsingEvents":
      return (
        <BrowsingEventsInput
          checkpoint={inputState.checkpoint}
          events={inputState.events}
          onEventSelect={handleEventSelect}
          onBack={ctx.onBack}
        />
      )
    case "browsingEventDetail":
      return <BrowsingEventDetailInput event={inputState.selectedEvent} onBack={ctx.onBack} />
    default:
      return assertNever(inputState)
  }
}
