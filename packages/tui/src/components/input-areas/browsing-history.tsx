import { Text } from "ink"
import { KEY_HINTS, UI_CONSTANTS } from "../../constants.js"
import { formatTimestamp, truncateText } from "../../helpers.js"
import type { RunHistoryItem } from "../../types/index.js"
import { ListBrowser } from "../list-browser.js"

export type BrowsingHistoryInputProps = {
  runs: RunHistoryItem[]
  onRunSelect: (run: RunHistoryItem) => void
  onRunResume: (run: RunHistoryItem) => void
  onSwitchToExperts: () => void
}
export const BrowsingHistoryInput = ({
  runs,
  onRunSelect,
  onRunResume,
  onSwitchToExperts,
}: BrowsingHistoryInputProps) => (
  <ListBrowser
    title={`Run History ${KEY_HINTS.NAVIGATE} ${KEY_HINTS.RESUME} ${KEY_HINTS.CHECKPOINTS} ${KEY_HINTS.NEW}`}
    items={runs}
    onSelect={onRunResume}
    emptyMessage="No runs found. Press n to start a new run."
    extraKeyHandler={(char, _key, selected) => {
      if (char === "c" && selected) {
        onRunSelect(selected)
        return true
      }
      if (char === "n") {
        onSwitchToExperts()
        return true
      }
      return false
    }}
    renderItem={(run, isSelected) => (
      <Text key={run.runId} color={isSelected ? "cyan" : "gray"}>
        {isSelected ? ">" : " "} {run.expertKey} -{" "}
        {truncateText(run.inputText, UI_CONSTANTS.TRUNCATE_TEXT_SHORT)} (
        {formatTimestamp(run.startedAt)})
      </Text>
    )}
  />
)
