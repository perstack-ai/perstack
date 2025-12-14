import { Box, Text } from "ink"
import type { ExpertOption } from "../types/index.js"

export type ExpertListProps = {
  experts: ExpertOption[]
  selectedIndex: number
  showSource?: boolean
  inline?: boolean
  maxItems?: number
}
export const ExpertList = ({
  experts,
  selectedIndex,
  showSource = false,
  inline = false,
  maxItems,
}: ExpertListProps) => {
  const displayExperts = maxItems ? experts.slice(0, maxItems) : experts
  if (displayExperts.length === 0) {
    return <Text color="gray">No experts found.</Text>
  }
  const items = displayExperts.map((expert, index) => (
    <Text key={expert.key} color={index === selectedIndex ? "cyan" : "gray"}>
      {index === selectedIndex ? ">" : " "} {showSource ? expert.key : expert.name}
      {showSource && expert.source && (
        <>
          {" "}
          <Text color={expert.source === "configured" ? "green" : "yellow"}>
            [{expert.source === "configured" ? "config" : "recent"}]
          </Text>
        </>
      )}
      {inline ? " " : ""}
    </Text>
  ))
  return inline ? <Box>{items}</Box> : <Box flexDirection="column">{items}</Box>
}
