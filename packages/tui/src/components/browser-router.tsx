import { useInputAreaContext } from "../context/index.js"
import { assertNever } from "../helpers.js"
import type { InputState } from "../types/index.js"
import {
  BrowsingCheckpointsInput,
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
  switch (inputState.type) {
    case "browsingHistory":
      return (
        <BrowsingHistoryInput
          runs={inputState.runs}
          onRunSelect={ctx.onRunSelect}
          onRunResume={ctx.onRunResume}
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
          run={inputState.run}
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
          onBack={ctx.onBack}
        />
      )
    default:
      return assertNever(inputState)
  }
}
