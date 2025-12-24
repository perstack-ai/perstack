import type { Checkpoint } from "../schemas/checkpoint.js"
import type { CheckpointAction } from "../schemas/checkpoint-action.js"
import type { Message } from "../schemas/message.js"
import type { MessagePart } from "../schemas/message-part.js"
import type { Step } from "../schemas/step.js"
import type { ToolCall } from "../schemas/tool-call.js"
import type { ToolResult } from "../schemas/tool-result.js"

export const BASE_SKILL_PREFIX = "@perstack/base"

export type GetCheckpointActionParams = {
  checkpoint: Checkpoint
  step: Step
}

/**
 * Computes the checkpoint action from a checkpoint and step.
 * This is a utility function that interprets the checkpoint state
 * to determine what action the Expert performed.
 */
export function getCheckpointAction(params: GetCheckpointActionParams): CheckpointAction {
  const { checkpoint, step } = params
  const { status, delegateTo } = checkpoint
  const toolCall = step.toolCalls?.[0]
  const toolResult = step.toolResults?.[0]
  const skillName = toolCall?.skillName
  const toolName = toolCall?.toolName

  if (status === "stoppedByDelegate" && delegateTo && delegateTo.length > 0) {
    return createDelegateAction(delegateTo)
  }

  if (status === "stoppedByInteractiveTool" && skillName && toolName && toolCall) {
    return createInteractiveToolAction(skillName, toolName, toolCall)
  }

  if (!skillName || !toolName || !toolCall || !toolResult) {
    return createRetryAction(step.newMessages)
  }

  if (skillName.startsWith(BASE_SKILL_PREFIX)) {
    return createBaseToolAction(toolName, toolCall, toolResult)
  }

  return createGeneralToolAction(skillName, toolName, toolCall, toolResult)
}

function createDelegateAction(delegateTo: NonNullable<Checkpoint["delegateTo"]>): CheckpointAction {
  return {
    type: "delegate",
    delegateTo: delegateTo.map((d) => ({
      expertKey: d.expert.key,
      query: d.query,
    })),
  }
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
    args: toolCall.args,
  }
}

function createRetryAction(newMessages: Message[]): CheckpointAction {
  const lastMessage = newMessages[newMessages.length - 1]
  const textPart = lastMessage?.contents.find((c) => c.type === "textPart")
  return {
    type: "retry",
    error: "No tool call or result found",
    message: textPart?.text ?? "",
  }
}

function createBaseToolAction(
  toolName: string,
  toolCall: ToolCall,
  toolResult: ToolResult,
): CheckpointAction {
  const args = toolCall.args as Record<string, unknown>
  const resultContents = toolResult.result
  const errorText = getErrorFromResult(resultContents)

  switch (toolName) {
    case "attemptCompletion": {
      const remainingTodos = parseRemainingTodosFromResult(resultContents)
      return {
        type: "attemptCompletion",
        remainingTodos,
        error: errorText,
      }
    }

    case "todo": {
      const todos = parseTodosFromResult(resultContents)
      return {
        type: "todo",
        newTodos: Array.isArray(args.newTodos) ? args.newTodos.map(String) : undefined,
        completedTodos: Array.isArray(args.completedTodos)
          ? args.completedTodos.map(Number)
          : undefined,
        todos,
        error: errorText,
      }
    }

    case "clearTodo":
      return {
        type: "clearTodo",
        error: errorText,
      }

    case "readImageFile":
      return {
        type: "readImageFile",
        path: String(args.path ?? ""),
        mimeType: parseStringField(resultContents, "mimeType"),
        size: parseNumberField(resultContents, "size"),
        error: errorText,
      }

    case "readPdfFile":
      return {
        type: "readPdfFile",
        path: String(args.path ?? ""),
        mimeType: parseStringField(resultContents, "mimeType"),
        size: parseNumberField(resultContents, "size"),
        error: errorText,
      }

    case "readTextFile":
      return {
        type: "readTextFile",
        path: String(args.path ?? ""),
        content: parseStringField(resultContents, "content"),
        from: typeof args.from === "number" ? args.from : undefined,
        to: typeof args.to === "number" ? args.to : undefined,
        error: errorText,
      }

    case "editTextFile":
      return {
        type: "editTextFile",
        path: String(args.path ?? ""),
        newText: String(args.newText ?? ""),
        oldText: String(args.oldText ?? ""),
        error: errorText,
      }

    case "appendTextFile":
      return {
        type: "appendTextFile",
        path: String(args.path ?? ""),
        text: String(args.text ?? ""),
        error: errorText,
      }

    case "writeTextFile":
      return {
        type: "writeTextFile",
        path: String(args.path ?? ""),
        text: String(args.text ?? ""),
        error: errorText,
      }

    case "deleteFile":
      return {
        type: "deleteFile",
        path: String(args.path ?? ""),
        error: errorText,
      }

    case "deleteDirectory":
      return {
        type: "deleteDirectory",
        path: String(args.path ?? ""),
        recursive: typeof args.recursive === "boolean" ? args.recursive : undefined,
        error: errorText,
      }

    case "moveFile":
      return {
        type: "moveFile",
        source: String(args.source ?? ""),
        destination: String(args.destination ?? ""),
        error: errorText,
      }

    case "getFileInfo":
      return {
        type: "getFileInfo",
        path: String(args.path ?? ""),
        info: parseFileInfoFromResult(resultContents),
        error: errorText,
      }

    case "createDirectory":
      return {
        type: "createDirectory",
        path: String(args.path ?? ""),
        error: errorText,
      }

    case "listDirectory":
      return {
        type: "listDirectory",
        path: String(args.path ?? ""),
        items: parseListDirectoryFromResult(resultContents),
        error: errorText,
      }

    case "exec":
      return {
        type: "exec",
        command: String(args.command ?? ""),
        args: Array.isArray(args.args) ? args.args.map(String) : [],
        cwd: String(args.cwd ?? ""),
        output: parseStringField(resultContents, "output"),
        error: errorText,
        stdout: parseStringField(resultContents, "stdout"),
        stderr: parseStringField(resultContents, "stderr"),
      }

    default:
      return createGeneralToolAction(BASE_SKILL_PREFIX, toolName, toolCall, toolResult)
  }
}

function createGeneralToolAction(
  skillName: string,
  toolName: string,
  toolCall: ToolCall,
  toolResult: ToolResult,
): CheckpointAction {
  const errorText = getErrorFromResult(toolResult.result)
  return {
    type: "generalTool",
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
    // Not JSON, check for error in text
    if (textPart.text.toLowerCase().includes("error")) {
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
