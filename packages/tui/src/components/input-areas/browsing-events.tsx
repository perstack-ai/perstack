import { Text } from "ink"
import { KEY_HINTS } from "../../constants.js"
import { formatTimestamp, noop } from "../../helpers.js"
import type { CheckpointHistoryItem, EventHistoryItem } from "../../types/index.js"
import { ListBrowser } from "../list-browser.js"

export type BrowsingEventsInputProps = {
  checkpoint: CheckpointHistoryItem
  events: EventHistoryItem[]
  onBack: () => void
}
export const BrowsingEventsInput = ({ checkpoint, events, onBack }: BrowsingEventsInputProps) => (
  <ListBrowser
    title={`Events for Step ${checkpoint.stepNumber} ${KEY_HINTS.NAVIGATE} ${KEY_HINTS.BACK}`}
    items={events}
    onSelect={noop}
    onBack={onBack}
    emptyMessage="No events found"
    renderItem={(ev, isSelected) => (
      <Text key={ev.id} color={isSelected ? "cyan" : "gray"}>
        {isSelected ? ">" : " "} [{ev.type}] Step {ev.stepNumber} ({formatTimestamp(ev.timestamp)})
      </Text>
    )}
  />
)
