import { Box, Text } from "ink"
import type React from "react"
import type { ActionEntry } from "../types/index.js"
import { ActionRow, ActionRowSimple } from "./action-row.js"
import { CheckpointActionRow } from "./checkpoint-action-row.js"

type StaticEntryRowProps = {
  entry: ActionEntry
}

/**
 * Renders a completed action entry in the Static section.
 * This component is used within ink's <Static> component, meaning it only
 * renders once and never updates.
 */
export const StaticEntryRow = ({ entry }: StaticEntryRowProps): React.ReactNode => {
  switch (entry.type) {
    case "query":
      return <QueryRow text={entry.text} />
    case "action":
      return <CheckpointActionRow action={entry.action} />
    case "delegation-started":
      return (
        <ActionRow
          indicatorColor="yellow"
          label={`Delegate → ${entry.expertName} (${entry.runtime} v${entry.version})`}
        >
          {entry.query && <Text dimColor>{entry.query}</Text>}
        </ActionRow>
      )
    case "delegation-completed":
      return (
        <ActionRow
          indicatorColor="green"
          label={`Delegation Complete: ${entry.expertName} (${entry.runtime} v${entry.version})`}
        >
          <Text dimColor>{entry.result ?? "No result"}</Text>
        </ActionRow>
      )
    case "docker-build":
      return <DockerBuildRow entry={entry} />
    case "docker-container":
      return <DockerContainerRow entry={entry} />
    case "proxy-access":
      return <ProxyAccessRow entry={entry} />
    case "error":
      return <ErrorRow entry={entry} />
  }
}

function QueryRow({ text }: { text: string }): React.ReactNode {
  const lines = text.split("\n")
  return (
    <ActionRow indicatorColor="cyan" label="Query">
      <Box flexDirection="column">
        {lines.map((line, idx) => (
          <Text key={`query-${idx}`} dimColor wrap="wrap">
            {line}
          </Text>
        ))}
      </Box>
    </ActionRow>
  )
}

function DockerBuildRow({
  entry,
}: {
  entry: Extract<ActionEntry, { type: "docker-build" }>
}): React.ReactNode {
  const stageColors: Record<string, "yellow" | "green" | "red" | "blue"> = {
    pulling: "blue",
    building: "yellow",
    complete: "green",
    error: "red",
  }
  const color = stageColors[entry.stage] ?? "white"
  return (
    <ActionRow indicatorColor={color} label={`Docker Build: ${entry.service}`}>
      <Text dimColor>{entry.message}</Text>
    </ActionRow>
  )
}

function DockerContainerRow({
  entry,
}: {
  entry: Extract<ActionEntry, { type: "docker-container" }>
}): React.ReactNode {
  const statusColors: Record<string, "yellow" | "green" | "red" | "blue"> = {
    starting: "blue",
    running: "yellow",
    healthy: "green",
    unhealthy: "red",
    stopped: "yellow",
    error: "red",
  }
  const color = statusColors[entry.status] ?? "white"
  return (
    <ActionRowSimple
      indicatorColor={color}
      text={`Docker: ${entry.service} (${entry.status})${entry.message ? ` - ${entry.message}` : ""}`}
    />
  )
}

function ProxyAccessRow({
  entry,
}: {
  entry: Extract<ActionEntry, { type: "proxy-access" }>
}): React.ReactNode {
  const color = entry.action === "allowed" ? "green" : "red"
  return (
    <ActionRowSimple
      indicatorColor={color}
      text={`Proxy ${entry.action}: ${entry.domain}:${entry.port}${entry.reason ? ` (${entry.reason})` : ""}`}
    />
  )
}

function ErrorRow({ entry }: { entry: Extract<ActionEntry, { type: "error" }> }): React.ReactNode {
  return (
    <ActionRow indicatorColor="red" label={entry.errorName}>
      <Text color="red">{entry.message}</Text>
    </ActionRow>
  )
}
