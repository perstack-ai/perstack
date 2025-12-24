import type {
  Checkpoint,
  CheckpointAction,
  MessagePart,
  Step,
  ToolCall,
  ToolResult,
} from "@perstack/core"

export const BASE_SKILL_PREFIX = "@perstack/base"

export type ToCheckpointActionParams = {
  checkpoint: Checkpoint
  step: Step
}

export function toCheckpointAction(params: ToCheckpointActionParams): CheckpointAction {
  const { checkpoint, step } = params
  const { status, delegateTo, messages } = checkpoint
  const toolCall = step.toolCalls?.[0]
  const toolResult = step.toolResults?.[0]
  const skillName = toolCall?.skillName
  const toolName = toolCall?.toolName

  if (status === "stoppedByDelegate" && delegateTo && delegateTo.length > 0) {
    return createDelegateAction(delegateTo, messages)
  }

  if (status === "stoppedByInteractiveTool" && skillName && toolName && toolCall) {
    return createInteractiveToolAction(skillName, toolName, toolCall)
  }

  if (!skillName || !toolName || !toolCall || !toolResult) {
    return createRetryAction(step.newMessages)
  }

  if (skillName.startsWith(BASE_SKILL_PREFIX)) {
    return createBaseToolAction(toolName, toolCall, toolResult, messages)
  }

  return createGeneralToolAction(skillName, toolName, toolCall, toolResult)
}

function createDelegateAction(
  delegateTo: NonNullable<Checkpoint["delegateTo"]>,
  messages: Checkpoint["messages"],
): CheckpointAction {
  const lastMessage = messages[messages.length - 1]
  if (!lastMessage) {
    return { type: "error", error: "No messages found for delegate action" }
  }

  const delegations = delegateTo.map((target) => ({
    expertKey: target.expert.key,
    query: target.query,
  }))

  return { type: "delegate", delegateTo: delegations }
}

function createInteractiveToolAction(
  skillName: string,
  toolName: string,
  toolCall: ToolCall,
): CheckpointAction {
  return {
    type: "interactiveTool",
    skillName,
    toolName,
    args: (toolCall.args as Record<string, unknown>) ?? {},
  }
}

function createRetryAction(newMessages: Step["newMessages"]): CheckpointAction {
  const newMessage = newMessages[0]
  if (!newMessage) {
    return { type: "error", error: "No new messages found" }
  }

  const textPart = newMessage.contents.find((c) => c.type === "textPart")
  if (!textPart || textPart.type !== "textPart") {
    return { type: "error", error: "No text part found in retry message" }
  }

  try {
    const parsed = JSON.parse(textPart.text) as { error?: string; message?: string }
    return {
      type: "retry",
      error: parsed.error ?? "Unknown error",
      message: parsed.message ?? "",
    }
  } catch {
    return { type: "error", error: "Failed to parse retry message" }
  }
}

function createBaseToolAction(
  toolName: string,
  toolCall: ToolCall,
  toolResult: ToolResult,
  messages: Checkpoint["messages"],
): CheckpointAction {
  switch (toolName) {
    case "attemptCompletion":
      return createAttemptCompletionAction(messages)
    case "think":
      return createThinkAction(toolCall)
    case "todo":
      return createTodoAction(toolCall, toolResult)
    case "readImageFile":
      return createReadImageFileAction(toolResult)
    case "readPdfFile":
      return createReadPdfFileAction(toolResult)
    case "readTextFile":
      return createReadTextFileAction(toolResult)
    case "editTextFile":
      return createEditTextFileAction(toolResult)
    case "appendTextFile":
      return createAppendTextFileAction(toolResult)
    case "deleteFile":
      return createDeleteFileAction(toolResult)
    case "moveFile":
      return createMoveFileAction(toolResult)
    case "getFileInfo":
      return createGetFileInfoAction(toolResult)
    case "writeTextFile":
      return createWriteTextFileAction(toolResult)
    case "createDirectory":
      return createCreateDirectoryAction(toolResult)
    case "listDirectory":
      return createListDirectoryAction(toolResult)
    case "testUrl":
      return createTestUrlAction(toolResult)
    default:
      return createGeneralToolAction(BASE_SKILL_PREFIX, toolName, toolCall, toolResult)
  }
}

function createAttemptCompletionAction(messages: Checkpoint["messages"]): CheckpointAction {
  const lastMessage = messages[messages.length - 1]
  if (!lastMessage) {
    return { type: "error", error: "No messages found" }
  }

  const textPart = lastMessage.contents.find((c) => c.type === "textPart")
  if (!textPart || textPart.type !== "textPart") {
    return { type: "error", error: "No text found" }
  }

  return { type: "attemptCompletion", result: textPart.text }
}

function createThinkAction(toolCall: ToolCall): CheckpointAction {
  const args = toolCall.args as { thought?: string } | undefined
  if (!args?.thought) {
    return { type: "error", error: "No thought found" }
  }
  return { type: "think", thought: args.thought }
}

function createTodoAction(toolCall: ToolCall, toolResult: ToolResult): CheckpointAction {
  const args = toolCall.args as { newTodos?: string[]; completedTodos?: number[] } | undefined
  const result = parseToolResultBody<{
    todos: { id: number; title: string; completed: boolean }[]
  }>(toolResult)

  if ("error" in result) {
    return { type: "error", error: result.error }
  }

  return {
    type: "todo",
    newTodos: args?.newTodos ?? [],
    completedTodos: args?.completedTodos ?? [],
    todos: result.todos,
  }
}

function createReadImageFileAction(toolResult: ToolResult): CheckpointAction {
  const result = parseToolResultBody<{ path: string; mimeType?: string; size?: number }>(toolResult)
  if ("error" in result) {
    return { type: "error", error: result.error }
  }
  return {
    type: "readImageFile",
    path: result.path,
    mimeType: result.mimeType,
    size: result.size,
  }
}

function createReadPdfFileAction(toolResult: ToolResult): CheckpointAction {
  const result = parseToolResultBody<{ path: string; mimeType?: string; size?: number }>(toolResult)
  if ("error" in result) {
    return { type: "error", error: result.error }
  }
  return {
    type: "readPdfFile",
    path: result.path,
    mimeType: result.mimeType,
    size: result.size,
  }
}

function createReadTextFileAction(toolResult: ToolResult): CheckpointAction {
  const result = parseToolResultBody<{
    path: string
    content: string
    from?: number
    to?: number
  }>(toolResult)
  if ("error" in result) {
    return { type: "error", error: result.error }
  }
  return {
    type: "readTextFile",
    path: result.path,
    content: result.content,
    from: result.from,
    to: result.to,
  }
}

function createEditTextFileAction(toolResult: ToolResult): CheckpointAction {
  const result = parseToolResultBody<{ path: string; newText?: string; oldText?: string }>(
    toolResult,
  )
  if ("error" in result) {
    return { type: "error", error: result.error }
  }
  return {
    type: "editTextFile",
    path: result.path,
    newText: result.newText,
    oldText: result.oldText,
  }
}

function createAppendTextFileAction(toolResult: ToolResult): CheckpointAction {
  const result = parseToolResultBody<{ path: string; text: string }>(toolResult)
  if ("error" in result) {
    return { type: "error", error: result.error }
  }
  return { type: "appendTextFile", path: result.path, text: result.text }
}

function createDeleteFileAction(toolResult: ToolResult): CheckpointAction {
  const result = parseToolResultBody<{ path: string }>(toolResult)
  if ("error" in result) {
    return { type: "error", error: result.error }
  }
  return { type: "deleteFile", path: result.path }
}

function createMoveFileAction(toolResult: ToolResult): CheckpointAction {
  const result = parseToolResultBody<{ source: string; destination: string }>(toolResult)
  if ("error" in result) {
    return { type: "error", error: result.error }
  }
  return { type: "moveFile", source: result.source, destination: result.destination }
}

function createGetFileInfoAction(toolResult: ToolResult): CheckpointAction {
  const result = parseToolResultBody<{
    path: string
    exists: boolean
    absolutePath: string
    name: string
    directory: string
    extension?: string
    mimeType?: string
    size: number
    sizeFormatted: string
    created: string
    modified: string
    accessed: string
    permissions: { readable: boolean; writable: boolean; executable: boolean }
  }>(toolResult)
  if ("error" in result) {
    return { type: "error", error: result.error }
  }
  return {
    type: "getFileInfo",
    path: result.path,
    exists: result.exists,
    absolutePath: result.absolutePath,
    name: result.name,
    directory: result.directory,
    extension: result.extension,
    mimeType: result.mimeType,
    size: result.size,
    sizeFormatted: result.sizeFormatted,
    created: result.created,
    modified: result.modified,
    accessed: result.accessed,
    permissions: result.permissions,
  }
}

function createWriteTextFileAction(toolResult: ToolResult): CheckpointAction {
  const result = parseToolResultBody<{ path: string; text: string }>(toolResult)
  if ("error" in result) {
    return { type: "error", error: result.error }
  }
  return { type: "writeTextFile", path: result.path, text: result.text }
}

function createCreateDirectoryAction(toolResult: ToolResult): CheckpointAction {
  const result = parseToolResultBody<{ path: string }>(toolResult)
  if ("error" in result) {
    return { type: "error", error: result.error }
  }
  return { type: "createDirectory", path: result.path }
}

function createListDirectoryAction(toolResult: ToolResult): CheckpointAction {
  const result = parseToolResultBody<{
    path: string
    items: {
      name: string
      path: string
      type: "directory" | "file"
      size: number
      modified: string
    }[]
  }>(toolResult)
  if ("error" in result) {
    return { type: "error", error: result.error }
  }
  return { type: "listDirectory", path: result.path, items: result.items }
}

function createTestUrlAction(toolResult: ToolResult): CheckpointAction {
  const result = parseToolResultBody<{
    results: { url: string; status: number; title: string; description: string }[]
  }>(toolResult)
  if ("error" in result) {
    return { type: "error", error: result.error }
  }
  return { type: "testUrl", results: result.results }
}

function createGeneralToolAction(
  skillName: string,
  toolName: string,
  toolCall: ToolCall,
  toolResult: ToolResult,
): CheckpointAction {
  return {
    type: "generalTool",
    skillName,
    toolName,
    args: (toolCall.args as Record<string, unknown>) ?? {},
    result: toolResult.result as MessagePart[],
  }
}

function parseToolResultBody<T>(toolResult: ToolResult): T | { error: string } {
  const textPart = toolResult.result.find((c) => c.type === "textPart")
  if (!textPart || textPart.type !== "textPart") {
    return { error: "No result found" }
  }

  try {
    return JSON.parse(textPart.text) as T
  } catch {
    return { error: "Invalid JSON in tool result" }
  }
}
