import { Box, Text } from "ink"
import { RENDER_CONSTANTS, UI_CONSTANTS } from "../constants.js"
import { shortenPath, summarizeOutput, truncateText } from "../helpers.js"
import type { LogEntry } from "../types/index.js"
import {
  ActionRow,
  ActionRowSimple,
  CompletionRow,
  QueryRow,
  type StatusColor,
} from "./action-row.js"

type ToolResult = Array<{ type: string; text?: string }>
const getResultText = (result?: ToolResult): string => {
  if (!result) return ""
  return result.find((r) => r.type === "textPart")?.text ?? ""
}
const getString = (args: Record<string, unknown>, key: string): string => {
  const value = args[key]
  return typeof value === "string" ? value : ""
}
const getStringArray = (args: Record<string, unknown>, key: string): string[] => {
  const value = args[key]
  return Array.isArray(value) ? (value as string[]) : []
}
const getNumberArray = (args: Record<string, unknown>, key: string): number[] => {
  const value = args[key]
  return Array.isArray(value) ? (value as number[]) : []
}
const renderThink = (args: Record<string, unknown>) => {
  const thought = getString(args, "thought")
  return <ActionRowSimple indicatorColor="white" text={thought} textDimColor={true} />
}
const renderAttemptCompletion = () => <ActionRowSimple indicatorColor="white" text="Run Results" />
const getTodosFromResult = (
  result: ToolResult | undefined,
): { id: number; title: string; completed: boolean }[] => {
  if (!result) return []
  const text = result.find((r) => r.type === "textPart")?.text
  if (!text) return []
  try {
    const parsed = JSON.parse(text) as {
      todos?: { id: number; title: string; completed: boolean }[]
    }
    return parsed.todos ?? []
  } catch {
    return []
  }
}
const renderTodo = (args: Record<string, unknown>, result: ToolResult | undefined) => {
  const newTodos = getStringArray(args, "newTodos")
  const completedTodoIds = getNumberArray(args, "completedTodos")
  if (newTodos.length === 0 && completedTodoIds.length === 0) return null
  if (newTodos.length > 0) {
    const label = `Todo Added ${newTodos.length} task${newTodos.length > 1 ? "s" : ""}`
    const preview = newTodos.slice(0, RENDER_CONSTANTS.NEW_TODO_MAX_PREVIEW)
    const remaining = newTodos.length - preview.length
    return (
      <ActionRow indicatorColor="white" label={label}>
        <Box flexDirection="column">
          {preview.map((todo, idx) => (
            <Text key={`todo-${idx}`} dimColor>
              ○ {todo}
            </Text>
          ))}
          {remaining > 0 && <Text dimColor>... +{remaining} more</Text>}
        </Box>
      </ActionRow>
    )
  }
  const todos = getTodosFromResult(result)
  const completedTitles = completedTodoIds
    .map((id) => todos.find((t) => t.id === id)?.title)
    .filter((t): t is string => t !== undefined)
  const label = `Todo Completed ${completedTodoIds.length} task${completedTodoIds.length > 1 ? "s" : ""}`
  if (completedTitles.length === 0) {
    return <ActionRowSimple indicatorColor="white" text={label} />
  }
  const preview = completedTitles.slice(0, RENDER_CONSTANTS.NEW_TODO_MAX_PREVIEW)
  const remaining = completedTitles.length - preview.length
  return (
    <ActionRow indicatorColor="white" label={label}>
      <Box flexDirection="column">
        {preview.map((title, idx) => (
          <Text key={`completed-${idx}`} dimColor>
            ✓ {title}
          </Text>
        ))}
        {remaining > 0 && <Text dimColor>... +{remaining} more</Text>}
      </Box>
    </ActionRow>
  )
}
const renderExec = (
  args: Record<string, unknown>,
  result: ToolResult | undefined,
  color: StatusColor,
) => {
  const command = getString(args, "command")
  const cmdArgs = getStringArray(args, "args")
  const cwd = getString(args, "cwd")
  const cwdPart = cwd ? ` ${shortenPath(cwd, 40)}` : ""
  const cmdLine = truncateText(
    `${command} ${cmdArgs.join(" ")}${cwdPart}`,
    UI_CONSTANTS.TRUNCATE_TEXT_DEFAULT,
  )
  const text = getResultText(result)
  const { visible, remaining } = summarizeOutput(
    text.split("\n"),
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
const parseReadTextFileResult = (
  result: ToolResult | undefined,
): { content: string; from?: number; to?: number } => {
  const text = getResultText(result)
  if (!text) return { content: "" }
  try {
    return JSON.parse(text) as { content: string; from?: number; to?: number }
  } catch {
    return { content: "" }
  }
}
const renderReadTextFile = (
  args: Record<string, unknown>,
  result: ToolResult | undefined,
  color: StatusColor,
) => {
  const path = getString(args, "path")
  const { content, from, to } = parseReadTextFileResult(result)
  const lineRange = from !== undefined && to !== undefined ? `#${from}-${to}` : ""
  const lines = content?.split("\n") ?? []
  return (
    <ActionRow
      indicatorColor={color}
      label="Read Text File"
      summary={`${shortenPath(path)}${lineRange}`}
    >
      <Box flexDirection="column">
        {lines.map((line: string, idx: number) => (
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
const renderWriteTextFile = (args: Record<string, unknown>, color: StatusColor) => {
  const path = getString(args, "path")
  const text = getString(args, "text")
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
const renderEditTextFile = (args: Record<string, unknown>, color: StatusColor) => {
  const path = getString(args, "path")
  const oldText = getString(args, "oldText")
  const newText = getString(args, "newText")
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
const renderAppendTextFile = (args: Record<string, unknown>, color: StatusColor) => {
  const path = getString(args, "path")
  const text = getString(args, "text")
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
const renderListDirectory = (
  args: Record<string, unknown>,
  result: ToolResult | undefined,
  color: StatusColor,
) => {
  const path = getString(args, "path")
  const text = getResultText(result)
  const { visible, remaining } = summarizeOutput(
    text.split("\n"),
    RENDER_CONSTANTS.LIST_DIR_MAX_ITEMS,
  )
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
const renderDeleteFile = (args: Record<string, unknown>, color: StatusColor) => {
  const path = getString(args, "path")
  return (
    <ActionRow indicatorColor={color} label="Delete" summary={shortenPath(path)}>
      <Text dimColor>Removed</Text>
    </ActionRow>
  )
}
const renderMoveFile = (args: Record<string, unknown>, color: StatusColor) => {
  const sourcePath = getString(args, "sourcePath")
  const destinationPath = getString(args, "destinationPath")
  return (
    <ActionRow indicatorColor={color} label="Move" summary={shortenPath(sourcePath)}>
      <Text dimColor>→ {shortenPath(destinationPath, 30)}</Text>
    </ActionRow>
  )
}
const renderCreateDirectory = (args: Record<string, unknown>, color: StatusColor) => {
  const path = getString(args, "path")
  return (
    <ActionRow indicatorColor={color} label="Mkdir" summary={shortenPath(path)}>
      <Text dimColor>Created</Text>
    </ActionRow>
  )
}
const renderGetFileInfo = (args: Record<string, unknown>, color: StatusColor) => {
  const path = getString(args, "path")
  return (
    <ActionRow indicatorColor={color} label="Info" summary={shortenPath(path)}>
      <Text dimColor>Fetched</Text>
    </ActionRow>
  )
}
const renderReadPdfFile = (args: Record<string, unknown>, color: StatusColor) => {
  const path = getString(args, "path")
  return (
    <ActionRow indicatorColor={color} label="PDF" summary={shortenPath(path)}>
      <Text dimColor>Read</Text>
    </ActionRow>
  )
}
const renderReadImageFile = (args: Record<string, unknown>, color: StatusColor) => {
  const path = getString(args, "path")
  return (
    <ActionRow indicatorColor={color} label="Image" summary={shortenPath(path)}>
      <Text dimColor>Read</Text>
    </ActionRow>
  )
}
const renderTestUrl = (args: Record<string, unknown>, color: StatusColor) => {
  const urls = getStringArray(args, "urls")
  return (
    <ActionRow indicatorColor={color} label="TestURL">
      <Text dimColor>{urls.length} URL(s)</Text>
    </ActionRow>
  )
}
const renderDefault = (toolName: string, args: Record<string, unknown>, color: StatusColor) => (
  <ActionRow indicatorColor={color} label={toolName}>
    <Text dimColor>{truncateText(JSON.stringify(args), UI_CONSTANTS.TRUNCATE_TEXT_MEDIUM)}</Text>
  </ActionRow>
)
const renderDelegationStarted = (
  expertName: string,
  runtime: string,
  version: string,
  query?: string,
): React.ReactNode => {
  const label = `Delegation Started (${expertName}, ${runtime}, v${version})`
  return (
    <ActionRow indicatorColor="yellow" label={label}>
      {query && <Text dimColor>{truncateText(query, UI_CONSTANTS.TRUNCATE_TEXT_MEDIUM)}</Text>}
    </ActionRow>
  )
}
const renderDelegationCompleted = (
  expertName: string,
  runtime: string,
  version: string,
  result?: string,
): React.ReactNode => {
  const label = `Delegation Completed (${expertName}, ${runtime}, v${version})`
  const trimmedResult = result?.trim()
  return (
    <ActionRow indicatorColor="green" label={label}>
      {trimmedResult && (
        <Text dimColor>{truncateText(trimmedResult, UI_CONSTANTS.TRUNCATE_TEXT_MEDIUM)}</Text>
      )}
    </ActionRow>
  )
}
const renderToolFromLog = (
  toolName: string,
  args: Record<string, unknown>,
  result?: Array<{ type: string; text?: string }>,
  isSuccess?: boolean,
): React.ReactNode => {
  const color: StatusColor = isSuccess === undefined ? "yellow" : isSuccess ? "green" : "red"
  switch (toolName) {
    case "think":
      return renderThink(args)
    case "attemptCompletion":
      return renderAttemptCompletion()
    case "todo":
      return renderTodo(args, result)
    case "exec":
      return renderExec(args, result, color)
    case "readTextFile":
      return renderReadTextFile(args, result, color)
    case "writeTextFile":
      return renderWriteTextFile(args, color)
    case "editTextFile":
      return renderEditTextFile(args, color)
    case "appendTextFile":
      return renderAppendTextFile(args, color)
    case "listDirectory":
      return renderListDirectory(args, result, color)
    case "deleteFile":
      return renderDeleteFile(args, color)
    case "moveFile":
      return renderMoveFile(args, color)
    case "createDirectory":
      return renderCreateDirectory(args, color)
    case "getFileInfo":
      return renderGetFileInfo(args, color)
    case "readPdfFile":
      return renderReadPdfFile(args, color)
    case "readImageFile":
      return renderReadImageFile(args, color)
    case "testUrl":
      return renderTestUrl(args, color)
    default:
      return renderDefault(toolName, args, color)
  }
}
type LogEntryRowProps = {
  entry: LogEntry
}
export const LogEntryRow = ({ entry }: LogEntryRowProps) => {
  switch (entry.type) {
    case "query":
      return <QueryRow text={entry.text} />
    case "tool":
      return (
        <Box>{renderToolFromLog(entry.toolName, entry.args, entry.result, entry.isSuccess)}</Box>
      )
    case "delegation-started":
      return (
        <Box>
          {renderDelegationStarted(entry.expertName, entry.runtime, entry.version, entry.query)}
        </Box>
      )
    case "delegation-completed":
      return (
        <Box>
          {renderDelegationCompleted(entry.expertName, entry.runtime, entry.version, entry.result)}
        </Box>
      )
    case "completion":
      return <CompletionRow text={entry.text} />
  }
}
