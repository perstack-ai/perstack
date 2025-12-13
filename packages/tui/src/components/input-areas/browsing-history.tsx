import { Text } from "ink"
import React from "react"
import { KEY_HINTS } from "../../constants.js"
import { formatTimestamp } from "../../helpers.js"
import type { JobHistoryItem } from "../../types/index.js"
import { ListBrowser } from "../list-browser.js"

export type BrowsingHistoryInputProps = {
  jobs: JobHistoryItem[]
  onJobSelect: (job: JobHistoryItem) => void
  onJobResume: (job: JobHistoryItem) => void
  onSwitchToExperts: () => void
}
export const BrowsingHistoryInput = ({
  jobs,
  onJobSelect,
  onJobResume,
  onSwitchToExperts,
}: BrowsingHistoryInputProps) => (
  <ListBrowser
    title={`Job History ${KEY_HINTS.NAVIGATE} ${KEY_HINTS.RESUME} ${KEY_HINTS.CHECKPOINTS} ${KEY_HINTS.NEW}`}
    items={jobs}
    onSelect={onJobResume}
    emptyMessage="No jobs found. Press n to start a new job."
    extraKeyHandler={(char, _key, selected) => {
      if (char === "c" && selected) {
        onJobSelect(selected)
        return true
      }
      if (char === "n") {
        onSwitchToExperts()
        return true
      }
      return false
    }}
    renderItem={(job, isSelected) => (
      <Text key={job.jobId} color={isSelected ? "cyan" : "gray"}>
        {isSelected ? ">" : " "} {job.expertKey} - {job.totalSteps} steps ({job.jobId}) (
        {formatTimestamp(job.startedAt)})
      </Text>
    )}
  />
)
