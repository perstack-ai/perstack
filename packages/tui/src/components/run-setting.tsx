import { Box, Text, useInput } from "ink"
import { useTextInput } from "../hooks/index.js"
import type { RuntimeInfo } from "../types/index.js"
export type RunSettingProps = {
  info: RuntimeInfo
  eventCount: number
  isEditing: boolean
  expertName?: string
  onQuerySubmit?: (query: string) => void
}
export const RunSetting = ({
  info,
  eventCount,
  isEditing,
  expertName,
  onQuerySubmit,
}: RunSettingProps) => {
  const { input, handleInput } = useTextInput({
    onSubmit: onQuerySubmit ?? (() => {}),
  })
  useInput(handleInput, { isActive: isEditing })
  const displayExpertName = expertName ?? info.expertName
  const skills = info.activeSkills.length > 0 ? info.activeSkills.join(", ") : ""
  const step = info.currentStep !== undefined ? String(info.currentStep) : ""
  const usagePercent = (info.contextWindowUsage * 100).toFixed(1)
  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="gray"
      borderTop={true}
      borderBottom={false}
      borderLeft={false}
      borderRight={false}
    >
      <Text>
        <Text bold color="cyan">
          {info.runtime === "perstack" || !info.runtime
            ? "Perstack"
            : info.runtime === "claude-code"
              ? "Claude Code"
              : info.runtime.charAt(0).toUpperCase() + info.runtime.slice(1)}
        </Text>
        {info.runtime === "docker" ? (
          <Text color={info.dockerState === "building" ? "yellow" : "gray"}>
            {" "}
            ({info.dockerState ?? "initializing"})
          </Text>
        ) : (
          info.runtimeVersion && (
            <Text color="gray">
              {" "}
              (
              {info.runtime === "perstack" || !info.runtime
                ? `v${info.runtimeVersion}`
                : info.runtimeVersion}
              )
            </Text>
          )
        )}
      </Text>
      <Text>
        <Text color="gray">Expert: </Text>
        <Text color="white">{displayExpertName}</Text>
        <Text color="gray"> / Skills: </Text>
        <Text color="green">{skills}</Text>
      </Text>
      <Text>
        <Text color="gray">Status: </Text>
        <Text
          color={
            info.status === "running" ? "green" : info.status === "completed" ? "cyan" : "yellow"
          }
        >
          {info.status}
        </Text>
        <Text color="gray"> / Step: </Text>
        <Text color="white">{step}</Text>
        <Text color="gray"> / Events: </Text>
        <Text color="white">{eventCount}</Text>
        <Text color="gray"> / Usage: </Text>
        <Text color="white">{usagePercent}%</Text>
      </Text>
      <Text>
        <Text color="gray">Model: </Text>
        <Text color="white">{info.model}</Text>
        <Text color="gray"> / Temperature: </Text>
        <Text color="white">{info.temperature}</Text>
      </Text>
      <Box>
        <Text color="gray">Query: </Text>
        {isEditing ? (
          <>
            <Text color="white">{input}</Text>
            <Text color="cyan">_</Text>
          </>
        ) : (
          <Text color="white">{info.query}</Text>
        )}
      </Box>
    </Box>
  )
}
