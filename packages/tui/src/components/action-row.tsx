import { Box, Text } from "ink"
import { INDICATOR } from "../constants.js"
export type StatusColor = "green" | "red" | "yellow" | "white" | "gray"

type QueryRowProps = {
  text: string
}
export const QueryRow = ({ text }: QueryRowProps) => (
  <Box flexDirection="row">
    <Box paddingRight={1}>
      <Text color="cyan">{INDICATOR.CHEVRON_RIGHT}</Text>
    </Box>
    <Text color="cyan">{text}</Text>
  </Box>
)

type CompletionRowProps = {
  text: string
}
export const CompletionRow = ({ text }: CompletionRowProps) => (
  <Box>
    <Text color="white">{text}</Text>
  </Box>
)

type ActionRowSimpleProps = {
  indicatorColor: StatusColor
  text: string
  textDimColor?: boolean
}
export const ActionRowSimple = ({
  indicatorColor,
  text,
  textDimColor = false,
}: ActionRowSimpleProps) => (
  <Box flexDirection="column">
    <Box flexDirection="row">
      <Box paddingRight={1}>
        <Text color={indicatorColor}>{INDICATOR.BULLET}</Text>
      </Box>
      <Text color="white" dimColor={textDimColor}>
        {text}
      </Text>
    </Box>
  </Box>
)

type ActionRowProps = {
  indicatorColor: StatusColor
  label: string
  summary?: string
  children: React.ReactNode
}
export const ActionRow = ({ indicatorColor, label, summary, children }: ActionRowProps) => (
  <Box flexDirection="column">
    <Box flexDirection="row" gap={1}>
      <Text color={indicatorColor}>{INDICATOR.BULLET}</Text>
      <Text color="white">{label}</Text>
      {summary && (
        <Text color="white" dimColor>
          {summary}
        </Text>
      )}
    </Box>
    <Box flexDirection="row">
      <Box paddingRight={1}>
        <Text dimColor>{INDICATOR.TREE}</Text>
      </Box>
      {children}
    </Box>
  </Box>
)
