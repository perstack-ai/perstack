import type { CheckpointAction } from "@perstack/core"
import { Box, Text } from "ink"
import type React from "react"
import { RENDER_CONSTANTS, UI_CONSTANTS } from "../constants.js"
import { shortenPath, summarizeOutput, truncateText } from "../helpers.js"
import { ActionRow, ActionRowSimple, type StatusColor } from "./action-row.js"

type CheckpointActionRowProps = {
  action: CheckpointAction
}

export const CheckpointActionRow = ({ action }: CheckpointActionRowProps): React.ReactNode => {
  // Render reasoning if present (extended thinking)
  const reasoningElement = action.reasoning ? renderReasoning(action.reasoning) : null

  const actionElement = renderAction(action)

  if (!actionElement) return reasoningElement

  return (
    <Box flexDirection="column">
      {reasoningElement}
      {actionElement}
    </Box>
  )
}

function renderReasoning(text: string): React.ReactNode {
  const lines = text.split("\n")
  return (
    <ActionRow indicatorColor="white" label="Reasoning">
      <Box flexDirection="column">
        {lines.map((line, idx) => (
          <Text key={`reasoning-${idx}`} dimColor wrap="wrap">
            {line}
          </Text>
        ))}
      </Box>
    </ActionRow>
  )
}

function renderAction(action: CheckpointAction): React.ReactNode {
  const color: StatusColor =
    action.type === "error" || ("error" in action && action.error) ? "red" : "green"

  switch (action.type) {
    case "retry":
      return (
        <ActionRow indicatorColor="yellow" label="Retry">
          <Text dimColor>{action.message || action.error}</Text>
        </ActionRow>
      )

    case "complete":
      return (
        <ActionRow indicatorColor="green" label="Run Results">
          <Text>{action.text}</Text>
        </ActionRow>
      )

    case "attemptCompletion":
      // attemptCompletion is internal, actual result shown via complete action
      return null

    case "todo":
      return renderTodo(action, color)

    case "clearTodo":
      return <ActionRowSimple indicatorColor={color} text="Todo Cleared" />

    case "readTextFile":
      return renderReadTextFile(action, color)

    case "writeTextFile":
      return renderWriteTextFile(action, color)

    case "editTextFile":
      return renderEditTextFile(action, color)

    case "appendTextFile":
      return renderAppendTextFile(action, color)

    case "deleteFile":
      return (
        <ActionRow indicatorColor={color} label="Delete" summary={shortenPath(action.path)}>
          <Text dimColor>Removed</Text>
        </ActionRow>
      )

    case "deleteDirectory":
      return (
        <ActionRow indicatorColor={color} label="Delete Dir" summary={shortenPath(action.path)}>
          <Text dimColor>Removed{action.recursive ? " (recursive)" : ""}</Text>
        </ActionRow>
      )

    case "moveFile":
      return (
        <ActionRow indicatorColor={color} label="Move" summary={shortenPath(action.source)}>
          <Text dimColor>→ {shortenPath(action.destination, 30)}</Text>
        </ActionRow>
      )

    case "createDirectory":
      return (
        <ActionRow indicatorColor={color} label="Mkdir" summary={shortenPath(action.path)}>
          <Text dimColor>Created</Text>
        </ActionRow>
      )

    case "listDirectory":
      return renderListDirectory(action, color)

    case "getFileInfo":
      return (
        <ActionRow indicatorColor={color} label="Info" summary={shortenPath(action.path)}>
          <Text dimColor>Fetched</Text>
        </ActionRow>
      )

    case "readPdfFile":
      return (
        <ActionRow indicatorColor={color} label="PDF" summary={shortenPath(action.path)}>
          <Text dimColor>Read</Text>
        </ActionRow>
      )

    case "readImageFile":
      return (
        <ActionRow indicatorColor={color} label="Image" summary={shortenPath(action.path)}>
          <Text dimColor>Read</Text>
        </ActionRow>
      )

    case "exec":
      return renderExec(action, color)

    case "delegate":
      return (
        <ActionRow indicatorColor="yellow" label={`Delegate → ${action.expertKey}`}>
          <Text dimColor>{truncateText(action.query, UI_CONSTANTS.TRUNCATE_TEXT_MEDIUM)}</Text>
        </ActionRow>
      )

    case "interactiveTool":
      return (
        <ActionRow indicatorColor="yellow" label={`Interactive: ${action.toolName}`}>
          <Text dimColor>
            {truncateText(JSON.stringify(action.args), UI_CONSTANTS.TRUNCATE_TEXT_MEDIUM)}
          </Text>
        </ActionRow>
      )

    case "generalTool":
      return (
        <ActionRow indicatorColor={color} label={action.toolName}>
          <Text dimColor>
            {truncateText(JSON.stringify(action.args), UI_CONSTANTS.TRUNCATE_TEXT_MEDIUM)}
          </Text>
        </ActionRow>
      )

    case "error":
      return (
        <ActionRow indicatorColor="red" label="Error">
          <Text color="red">{action.error ?? "Unknown error"}</Text>
        </ActionRow>
      )

    default: {
      // Exhaustive check - if we get here, we missed a case
      const _exhaustive: never = action
      return null
    }
  }
}

function renderTodo(
  action: Extract<CheckpointAction, { type: "todo" }>,
  color: StatusColor,
): React.ReactNode {
  const { newTodos, completedTodos, todos } = action

  const hasNewTodos = newTodos && newTodos.length > 0
  const hasCompletedTodos = completedTodos && completedTodos.length > 0

  if (!hasNewTodos && !hasCompletedTodos) {
    return null
  }

  // Build label parts
  const labelParts: string[] = []
  if (hasNewTodos) {
    labelParts.push(`Added ${newTodos.length} task${newTodos.length > 1 ? "s" : ""}`)
  }
  if (hasCompletedTodos) {
    labelParts.push(
      `Completed ${completedTodos.length} task${completedTodos.length > 1 ? "s" : ""}`,
    )
  }
  const label = `Todo ${labelParts.join(", ")}`

  // Get completed titles for display
  const completedTitles = hasCompletedTodos
    ? completedTodos
        .map((id) => todos.find((t) => t.id === id)?.title)
        .filter((t): t is string => t !== undefined)
    : []

  // If no content to show in body, use simple row
  if (!hasNewTodos && completedTitles.length === 0) {
    return <ActionRowSimple indicatorColor={color} text={label} />
  }

  return (
    <ActionRow indicatorColor={color} label={label}>
      <Box flexDirection="column">
        {hasNewTodos &&
          newTodos.slice(0, RENDER_CONSTANTS.NEW_TODO_MAX_PREVIEW).map((todo, idx) => (
            <Text key={`todo-${idx}`} dimColor>
              ○ {todo}
            </Text>
          ))}
        {hasNewTodos && newTodos.length > RENDER_CONSTANTS.NEW_TODO_MAX_PREVIEW && (
          <Text dimColor>... +{newTodos.length - RENDER_CONSTANTS.NEW_TODO_MAX_PREVIEW} more</Text>
        )}
        {completedTitles.slice(0, RENDER_CONSTANTS.NEW_TODO_MAX_PREVIEW).map((title, idx) => (
          <Text key={`completed-${idx}`} dimColor>
            ✓ {title}
          </Text>
        ))}
        {completedTitles.length > RENDER_CONSTANTS.NEW_TODO_MAX_PREVIEW && (
          <Text dimColor>
            ... +{completedTitles.length - RENDER_CONSTANTS.NEW_TODO_MAX_PREVIEW} more
          </Text>
        )}
      </Box>
    </ActionRow>
  )
}

function renderReadTextFile(
  action: Extract<CheckpointAction, { type: "readTextFile" }>,
  color: StatusColor,
): React.ReactNode {
  const { path, content, from, to } = action
  const lineRange = from !== undefined && to !== undefined ? `#${from}-${to}` : ""
  const lines = content?.split("\n") ?? []
  return (
    <ActionRow
      indicatorColor={color}
      label="Read Text File"
      summary={`${shortenPath(path)}${lineRange}`}
    >
      <Box flexDirection="column">
        {lines.map((line, idx) => (
          <Box flexDirection="row" key={`read-${idx}`} gap={1}>
            <Text color="white" dimColor>
              {line}
            </Text>
          </Box>
        ))}
      </Box>
    </ActionRow>
  )
}

function renderWriteTextFile(
  action: Extract<CheckpointAction, { type: "writeTextFile" }>,
  color: StatusColor,
): React.ReactNode {
  const { path, text } = action
  const lines = text.split("\n")
  return (
    <ActionRow indicatorColor={color} label="Write Text File" summary={shortenPath(path)}>
      <Box flexDirection="column">
        {lines.map((line, idx) => (
          <Box flexDirection="row" key={`write-${idx}`} gap={1}>
            <Text color="green" dimColor>
              +
            </Text>
            <Text color="white" dimColor>
              {line}
            </Text>
          </Box>
        ))}
      </Box>
    </ActionRow>
  )
}

function renderEditTextFile(
  action: Extract<CheckpointAction, { type: "editTextFile" }>,
  color: StatusColor,
): React.ReactNode {
  const { path, oldText, newText } = action
  const oldLines = oldText.split("\n")
  const newLines = newText.split("\n")
  return (
    <ActionRow indicatorColor={color} label="Edit Text File" summary={shortenPath(path)}>
      <Box flexDirection="column">
        {oldLines.map((line, idx) => (
          <Box flexDirection="row" key={`old-${idx}`} gap={1}>
            <Text color="red" dimColor>
              -
            </Text>
            <Text color="white" dimColor>
              {line}
            </Text>
          </Box>
        ))}
        {newLines.map((line, idx) => (
          <Box flexDirection="row" key={`new-${idx}`} gap={1}>
            <Text color="green" dimColor>
              +
            </Text>
            <Text dimColor>{line}</Text>
          </Box>
        ))}
      </Box>
    </ActionRow>
  )
}

function renderAppendTextFile(
  action: Extract<CheckpointAction, { type: "appendTextFile" }>,
  color: StatusColor,
): React.ReactNode {
  const { path, text } = action
  const lines = text.split("\n")
  return (
    <ActionRow indicatorColor={color} label="Append Text File" summary={shortenPath(path)}>
      <Box flexDirection="column">
        {lines.map((line, idx) => (
          <Box flexDirection="row" key={`append-${idx}`} gap={1}>
            <Text color="green" dimColor>
              +
            </Text>
            <Text color="white" dimColor>
              {line}
            </Text>
          </Box>
        ))}
      </Box>
    </ActionRow>
  )
}

function renderListDirectory(
  action: Extract<CheckpointAction, { type: "listDirectory" }>,
  color: StatusColor,
): React.ReactNode {
  const { path, items } = action
  const itemLines =
    items?.map((item) => `${item.type === "directory" ? "📁" : "📄"} ${item.name}`) ?? []
  const { visible, remaining } = summarizeOutput(itemLines, RENDER_CONSTANTS.LIST_DIR_MAX_ITEMS)
  return (
    <ActionRow indicatorColor={color} label="List" summary={shortenPath(path)}>
      <Box flexDirection="column">
        {visible.map((line, idx) => (
          <Text key={`dir-${idx}`} dimColor>
            {truncateText(line, UI_CONSTANTS.TRUNCATE_TEXT_DEFAULT)}
          </Text>
        ))}
        {remaining > 0 && <Text dimColor>... +{remaining} more</Text>}
      </Box>
    </ActionRow>
  )
}

function renderExec(
  action: Extract<CheckpointAction, { type: "exec" }>,
  color: StatusColor,
): React.ReactNode {
  const { command, args, cwd, output } = action
  const cwdPart = cwd ? ` ${shortenPath(cwd, 40)}` : ""
  const cmdLine = truncateText(
    `${command} ${args.join(" ")}${cwdPart}`,
    UI_CONSTANTS.TRUNCATE_TEXT_DEFAULT,
  )
  const outputLines = output?.split("\n") ?? []
  const { visible, remaining } = summarizeOutput(
    outputLines,
    RENDER_CONSTANTS.EXEC_OUTPUT_MAX_LINES,
  )
  return (
    <ActionRow indicatorColor={color} label={`Bash ${cmdLine}`}>
      <Box flexDirection="column">
        {visible.map((line, idx) => (
          <Text key={`out-${idx}`} dimColor>
            {truncateText(line, UI_CONSTANTS.TRUNCATE_TEXT_DEFAULT)}
          </Text>
        ))}
        {remaining > 0 && <Text dimColor>... +{remaining} more</Text>}
      </Box>
    </ActionRow>
  )
}
