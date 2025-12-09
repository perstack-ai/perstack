import { Text } from "ink"
import { KEY_HINTS } from "../../constants.js"
import type { CheckpointHistoryItem, JobHistoryItem } from "../../types/index.js"
import { ListBrowser } from "../list-browser.js"

export type BrowsingCheckpointsInputProps = {
  job: JobHistoryItem
  checkpoints: CheckpointHistoryItem[]
  onCheckpointSelect: (checkpoint: CheckpointHistoryItem) => void
  onCheckpointResume: (checkpoint: CheckpointHistoryItem) => void
  onBack: () => void
}
export const BrowsingCheckpointsInput = ({
  job,
  checkpoints,
  onCheckpointSelect,
  onCheckpointResume,
  onBack,
}: BrowsingCheckpointsInputProps) => (
  <ListBrowser
    title={`Checkpoints for ${job.expertKey} ${KEY_HINTS.NAVIGATE} ${KEY_HINTS.RESUME} ${KEY_HINTS.EVENTS} ${KEY_HINTS.BACK}`}
    items={checkpoints}
    onSelect={onCheckpointResume}
    onBack={onBack}
    emptyMessage="No checkpoints found"
    extraKeyHandler={(char, _key, selected) => {
      if (char === "e" && selected) {
        onCheckpointSelect(selected)
        return true
      }
      return false
    }}
    renderItem={(cp, isSelected) => (
      <Text key={cp.id} color={isSelected ? "cyan" : "gray"}>
        {isSelected ? ">" : " "} Step {cp.stepNumber} ({cp.id})
      </Text>
    )}
  />
)
