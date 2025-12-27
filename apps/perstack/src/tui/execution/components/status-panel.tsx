import type React from "react"
import { RunSetting } from "../../components/index.js"
import type { RuntimeInfo } from "../../types/index.js"
import type { RunStatus } from "../hooks/index.js"

type StatusPanelProps = {
  runtimeInfo: RuntimeInfo
  eventCount: number
  runStatus: RunStatus
}

export const StatusPanel = ({
  runtimeInfo,
  eventCount,
  runStatus,
}: StatusPanelProps): React.ReactNode => {
  if (runStatus !== "running") {
    return null
  }

  return <RunSetting info={runtimeInfo} eventCount={eventCount} isEditing={false} />
}
