import type { Checkpoint, DelegationTarget } from "../schemas/checkpoint.js"
import type { Activity } from "../schemas/activity.js"
import type { Message } from "../schemas/message.js"
import type { MessagePart, ThinkingPart } from "../schemas/message-part.js"
import type { Step } from "../schemas/step.js"
import type { ToolCall } from "../schemas/tool-call.js"
import type { ToolResult } from "../schemas/tool-result.js"

export const BASE_SKILL_PREFIX = "@perstack/base"

export type GetActivitiesParams = {
  checkpoint: Checkpoint
  step: Step
}

/**
 * Extracts reasoning from Step.newMessages by finding thinkingParts.
 */
function extractReasoning(newMessages: Message[]): string | undefined {
  const thinkingParts: ThinkingPart[] = []
  for (const message of newMessages) {
    for (const content of message.contents) {
      if (content.type === "thinkingPart") {
        thinkingParts.push(content)
      }
    }
  }
  if (thinkingParts.length === 0) return undefined
  return thinkingParts.map((p) => p.thinking).join("\n\n")
}

/**
 * Computes activities from a checkpoint and step.
 * Returns an array of activities, supporting parallel tool calls and delegations.
 * Each tool call or delegation becomes a separate activity in the array.
 */
export function getActivities(params: GetActivitiesParams): Activity[] {
  const { checkpoint, step } = params
  const { status, delegateTo } = checkpoint
  const reasoning = extractReasoning(step.newMessages)

  // Completed run - final result generation (after attemptCompletion)
  if (status === "completed") {
    return [createCompleteActivity(step.newMessages, reasoning)]
  }

  // Error status - use checkpoint error information
  if (status === "stoppedByError") {
    return [createErrorActivity(checkpoint, reasoning)]
  }

  // Parallel delegate activities - each delegation becomes a separate activity
  if (status === "stoppedByDelegate") {
    if (!delegateTo || delegateTo.length === 0) {
      return [
        createRetryActivity(step.newMessages, reasoning, "Delegate status but no delegation targets"),
      ]
    }
    return delegateTo.map((d) => createDelegateActivity(d, reasoning))
  }

  // Interactive tool activities - may be parallel
  if (status === "stoppedByInteractiveTool") {
    const toolCalls = step.toolCalls ?? []
    if (toolCalls.length === 0) {
      return [createRetryActivity(step.newMessages, reasoning)]
    }
    return toolCalls.map((tc) =>
      createInteractiveToolActivity(tc.skillName, tc.toolName, tc, reasoning),
    )
  }

  // Normal tool activities - may be parallel
  const toolCalls = step.toolCalls ?? []
  const toolResults = step.toolResults ?? []

  if (toolCalls.length === 0) {
    return [createRetryActivity(step.newMessages, reasoning)]
  }

  const activities: Activity[] = []
  for (const toolCall of toolCalls) {
    const toolResult = toolResults.find((tr) => tr.id === toolCall.id)
    if (!toolResult) {
      // No result yet for this tool call, skip
      continue
    }
    const { skillName, toolName } = toolCall
    if (skillName.startsWith(BASE_SKILL_PREFIX)) {
      activities.push(createBaseToolActivity(toolName, toolCall, toolResult, reasoning))
    } else {
      activities.push(createGeneralToolActivity(skillName, toolName, toolCall, toolResult, reasoning))
    }
  }

  if (activities.length === 0) {
    return [createRetryActivity(step.newMessages, reasoning)]
  }

  return activities
}

function createCompleteActivity(
  newMessages: Message[],
  reasoning: string | undefined,
): Activity {
  // Extract final text from the last expertMessage's textPart
  const lastExpertMessage = [...newMessages].reverse().find((m) => m.type === "expertMessage")
  const textPart = lastExpertMessage?.contents.find((c) => c.type === "textPart")
  return {
    type: "complete",
    id: "",
    expertKey: "",
    runId: "",
    reasoning,
    text: textPart?.text ?? "",
  }
}

function createDelegateActivity(
  delegate: DelegationTarget,
  reasoning: string | undefined,
): Activity {
  return {
    type: "delegate",
    id: "",
    expertKey: "",
    runId: "",
    reasoning,
    delegateExpertKey: delegate.expert.key,
    query: delegate.query,
  }
}

function createInteractiveToolActivity(
  skillName: string,
  toolName: string,
  toolCall: ToolCall,
  reasoning: string | undefined,
): Activity {
  return {
    type: "interactiveTool",
    id: "",
    expertKey: "",
    runId: "",
    reasoning,
    skillName,
    toolName,
    args: toolCall.args,
  }
}

function createRetryActivity(
  newMessages: Message[],
  reasoning: string | undefined,
  customError?: string,
): Activity {
  const lastMessage = newMessages[newMessages.length - 1]
  const textPart = lastMessage?.contents.find((c) => c.type === "textPart")
  return {
    type: "retry",
    id: "",
    expertKey: "",
    runId: "",
    reasoning,
    error: customError ?? "No tool call or result found",
    message: textPart?.text ?? "",
  }
}

function createErrorActivity(
  checkpoint: Checkpoint,
  reasoning: string | undefined,
): Activity {
  const error = checkpoint.error
  return {
    type: "error",
    id: "",
    expertKey: "",
    runId: "",
    reasoning,
    error: error?.message ?? "Unknown error",
    errorName: error?.name,
    isRetryable: error?.isRetryable,
  }
}

export function createBaseToolActivity(
  toolName: string,
  toolCall: ToolCall,
  toolResult: ToolResult,
  reasoning: string | undefined,
): Activity {
  const args = toolCall.args as Record<string, unknown>
  const resultContents = toolResult.result
  const errorText = getErrorFromResult(resultContents)
  const baseFields = { id: "", expertKey: "", runId: "", reasoning }

  switch (toolName) {
    case "attemptCompletion": {
      const remainingTodos = parseRemainingTodosFromResult(resultContents)
      return {
        type: "attemptCompletion",
        ...baseFields,
        remainingTodos,
        error: errorText,
      }
    }

    case "todo": {
      const todos = parseTodosFromResult(resultContents)
      return {
        type: "todo",
        ...baseFields,
        newTodos: Array.isArray(args["newTodos"]) ? args["newTodos"].map(String) : undefined,
        completedTodos: Array.isArray(args["completedTodos"])
          ? args["completedTodos"].map(Number)
          : undefined,
        todos,
        error: errorText,
      }
    }

    case "clearTodo":
      return {
        type: "clearTodo",
        ...baseFields,
        error: errorText,
      }

    case "readImageFile":
      return {
        type: "readImageFile",
        ...baseFields,
        path: String(args["path"] ?? ""),
        mimeType: parseStringField(resultContents, "mimeType"),
        size: parseNumberField(resultContents, "size"),
        error: errorText,
      }

    case "readPdfFile":
      return {
        type: "readPdfFile",
        ...baseFields,
        path: String(args["path"] ?? ""),
        mimeType: parseStringField(resultContents, "mimeType"),
        size: parseNumberField(resultContents, "size"),
        error: errorText,
      }

    case "readTextFile":
      return {
        type: "readTextFile",
        ...baseFields,
        path: String(args["path"] ?? ""),
        content: parseStringField(resultContents, "content"),
        from: typeof args["from"] === "number" ? args["from"] : undefined,
        to: typeof args["to"] === "number" ? args["to"] : undefined,
        error: errorText,
      }

    case "editTextFile":
      return {
        type: "editTextFile",
        ...baseFields,
        path: String(args["path"] ?? ""),
        newText: String(args["newText"] ?? ""),
        oldText: String(args["oldText"] ?? ""),
        error: errorText,
      }

    case "appendTextFile":
      return {
        type: "appendTextFile",
        ...baseFields,
        path: String(args["path"] ?? ""),
        text: String(args["text"] ?? ""),
        error: errorText,
      }

    case "writeTextFile":
      return {
        type: "writeTextFile",
        ...baseFields,
        path: String(args["path"] ?? ""),
        text: String(args["text"] ?? ""),
        error: errorText,
      }

    case "deleteFile":
      return {
        type: "deleteFile",
        ...baseFields,
        path: String(args["path"] ?? ""),
        error: errorText,
      }

    case "deleteDirectory":
      return {
        type: "deleteDirectory",
        ...baseFields,
        path: String(args["path"] ?? ""),
        recursive: typeof args["recursive"] === "boolean" ? args["recursive"] : undefined,
        error: errorText,
      }

    case "moveFile":
      return {
        type: "moveFile",
        ...baseFields,
        source: String(args["source"] ?? ""),
        destination: String(args["destination"] ?? ""),
        error: errorText,
      }

    case "getFileInfo":
      return {
        type: "getFileInfo",
        ...baseFields,
        path: String(args["path"] ?? ""),
        info: parseFileInfoFromResult(resultContents),
        error: errorText,
      }

    case "createDirectory":
      return {
        type: "createDirectory",
        ...baseFields,
        path: String(args["path"] ?? ""),
        error: errorText,
      }

    case "listDirectory":
      return {
        type: "listDirectory",
        ...baseFields,
        path: String(args["path"] ?? ""),
        items: parseListDirectoryFromResult(resultContents),
        error: errorText,
      }

    case "exec":
      return {
        type: "exec",
        ...baseFields,
        command: String(args["command"] ?? ""),
        args: Array.isArray(args["args"]) ? args["args"].map(String) : [],
        cwd: String(args["cwd"] ?? ""),
        output: parseStringField(resultContents, "output"),
        error: errorText,
        stdout: parseStringField(resultContents, "stdout"),
        stderr: parseStringField(resultContents, "stderr"),
      }

    default:
      // Use actual skillName from toolCall, not the constant
      return createGeneralToolActivity(toolCall.skillName, toolName, toolCall, toolResult, reasoning)
  }
}

export function createGeneralToolActivity(
  skillName: string,
  toolName: string,
  toolCall: ToolCall,
  toolResult: ToolResult,
  reasoning: string | undefined,
): Activity {
  const errorText = getErrorFromResult(toolResult.result)
  return {
    type: "generalTool",
    id: "",
    expertKey: "",
    runId: "",
    reasoning,
    skillName,
    toolName,
    args: toolCall.args as Record<string, unknown>,
    result: toolResult.result,
    error: errorText,
  }
}

function getErrorFromResult(result: MessagePart[]): string | undefined {
  const textPart = result.find((p) => p.type === "textPart")
  if (!textPart?.text) return undefined
  try {
    const parsed = JSON.parse(textPart.text)
    if (typeof parsed.error === "string") {
      return parsed.error
    }
  } catch {
    // Not JSON - only treat as error if it starts with "Error:" or "error:"
    // This avoids false positives from text containing "error" in other contexts
    const trimmed = textPart.text.trim()
    if (trimmed.toLowerCase().startsWith("error:") || trimmed.toLowerCase().startsWith("error ")) {
      return textPart.text
    }
  }
  return undefined
}

function parseStringField(result: MessagePart[], field: string): string | undefined {
  const textPart = result.find((p) => p.type === "textPart")
  if (!textPart?.text) return undefined
  try {
    const parsed = JSON.parse(textPart.text)
    return typeof parsed[field] === "string" ? parsed[field] : undefined
  } catch {
    return undefined
  }
}

function parseNumberField(result: MessagePart[], field: string): number | undefined {
  const textPart = result.find((p) => p.type === "textPart")
  if (!textPart?.text) return undefined
  try {
    const parsed = JSON.parse(textPart.text)
    return typeof parsed[field] === "number" ? parsed[field] : undefined
  } catch {
    return undefined
  }
}

function parseRemainingTodosFromResult(
  result: MessagePart[],
): Array<{ id: number; title: string; completed: boolean }> | undefined {
  const textPart = result.find((p) => p.type === "textPart")
  if (!textPart?.text) return undefined
  try {
    const parsed = JSON.parse(textPart.text)
    if (Array.isArray(parsed.remainingTodos)) {
      return parsed.remainingTodos.map(
        (t: { id?: number; title?: string; completed?: boolean }, i: number) => ({
          id: typeof t.id === "number" ? t.id : i,
          title: typeof t.title === "string" ? t.title : "",
          completed: typeof t.completed === "boolean" ? t.completed : false,
        }),
      )
    }
  } catch {
    // Ignore parse errors
  }
  return undefined
}

function parseTodosFromResult(
  result: MessagePart[],
): Array<{ id: number; title: string; completed: boolean }> {
  const textPart = result.find((p) => p.type === "textPart")
  if (!textPart?.text) return []
  try {
    const parsed = JSON.parse(textPart.text)
    if (Array.isArray(parsed.todos)) {
      return parsed.todos.map(
        (t: { id?: number; title?: string; completed?: boolean }, i: number) => ({
          id: typeof t.id === "number" ? t.id : i,
          title: typeof t.title === "string" ? t.title : "",
          completed: typeof t.completed === "boolean" ? t.completed : false,
        }),
      )
    }
  } catch {
    // Ignore parse errors
  }
  return []
}

function parseFileInfoFromResult(result: MessagePart[]):
  | {
      exists: boolean
      name: string
      directory: string
      extension: string | null
      type: "file" | "directory"
      mimeType: string | null
      size: number
      sizeFormatted: string
      created: string
      modified: string
      accessed: string
    }
  | undefined {
  const textPart = result.find((p) => p.type === "textPart")
  if (!textPart?.text) return undefined
  try {
    const parsed = JSON.parse(textPart.text)
    return {
      exists: typeof parsed.exists === "boolean" ? parsed.exists : true,
      name: String(parsed.name ?? ""),
      directory: String(parsed.directory ?? ""),
      extension: typeof parsed.extension === "string" ? parsed.extension : null,
      type: parsed.type === "directory" ? "directory" : "file",
      mimeType: typeof parsed.mimeType === "string" ? parsed.mimeType : null,
      size: typeof parsed.size === "number" ? parsed.size : 0,
      sizeFormatted: String(parsed.sizeFormatted ?? ""),
      created: String(parsed.created ?? ""),
      modified: String(parsed.modified ?? ""),
      accessed: String(parsed.accessed ?? ""),
    }
  } catch {
    return undefined
  }
}

function parseListDirectoryFromResult(result: MessagePart[]):
  | Array<{
      name: string
      path: string
      type: "file" | "directory"
      size: number
      modified: string
    }>
  | undefined {
  const textPart = result.find((p) => p.type === "textPart")
  if (!textPart?.text) return undefined
  try {
    const parsed = JSON.parse(textPart.text)
    if (!Array.isArray(parsed.items)) return undefined
    return parsed.items.map(
      (item: {
        name?: string
        path?: string
        type?: string
        size?: number
        modified?: string
      }) => ({
        name: String(item.name ?? ""),
        path: String(item.path ?? ""),
        type: item.type === "directory" ? "directory" : "file",
        size: typeof item.size === "number" ? item.size : 0,
        modified: String(item.modified ?? ""),
      }),
    )
  } catch {
    return undefined
  }
}

// Re-export for backward compatibility (will be removed in future)
/** @deprecated Use getActivities instead */
export const getCheckpointActions = getActivities
/** @deprecated Use GetActivitiesParams instead */
export type GetCheckpointActionsParams = GetActivitiesParams

