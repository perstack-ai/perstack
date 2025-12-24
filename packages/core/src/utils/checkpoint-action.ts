import type { Checkpoint, DelegationTarget } from "../schemas/checkpoint.js"
import type { CheckpointAction } from "../schemas/checkpoint-action.js"
import type { Message } from "../schemas/message.js"
import type { MessagePart, ThinkingPart } from "../schemas/message-part.js"
import type { Step } from "../schemas/step.js"
import type { ToolCall } from "../schemas/tool-call.js"
import type { ToolResult } from "../schemas/tool-result.js"

export const BASE_SKILL_PREFIX = "@perstack/base"

export type GetCheckpointActionsParams = {
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
 * Computes checkpoint actions from a checkpoint and step.
 * Returns an array of actions, supporting parallel tool calls and delegations.
 * Each tool call or delegation becomes a separate action in the array.
 */
export function getCheckpointActions(params: GetCheckpointActionsParams): CheckpointAction[] {
  const { checkpoint, step } = params
  const { status, delegateTo } = checkpoint
  const reasoning = extractReasoning(step.newMessages)

  // Parallel delegate actions - each delegation becomes a separate action
  if (status === "stoppedByDelegate" && delegateTo && delegateTo.length > 0) {
    return delegateTo.map((d) => createDelegateAction(d, reasoning))
  }

  // Interactive tool actions - may be parallel
  if (status === "stoppedByInteractiveTool") {
    const toolCalls = step.toolCalls ?? []
    if (toolCalls.length === 0) {
      return [createRetryAction(step.newMessages, reasoning)]
    }
    return toolCalls.map((tc) =>
      createInteractiveToolAction(tc.skillName, tc.toolName, tc, reasoning),
    )
  }

  // Normal tool actions - may be parallel
  const toolCalls = step.toolCalls ?? []
  const toolResults = step.toolResults ?? []

  if (toolCalls.length === 0) {
    return [createRetryAction(step.newMessages, reasoning)]
  }

  const actions: CheckpointAction[] = []
  for (const toolCall of toolCalls) {
    const toolResult = toolResults.find((tr) => tr.id === toolCall.id)
    if (!toolResult) {
      // No result yet for this tool call, skip
      continue
    }
    const { skillName, toolName } = toolCall
    if (skillName.startsWith(BASE_SKILL_PREFIX)) {
      actions.push(createBaseToolAction(toolName, toolCall, toolResult, reasoning))
    } else {
      actions.push(createGeneralToolAction(skillName, toolName, toolCall, toolResult, reasoning))
    }
  }

  if (actions.length === 0) {
    return [createRetryAction(step.newMessages, reasoning)]
  }

  return actions
}

function createDelegateAction(
  delegate: DelegationTarget,
  reasoning: string | undefined,
): CheckpointAction {
  return {
    type: "delegate",
    reasoning,
    expertKey: delegate.expert.key,
    query: delegate.query,
  }
}

function createInteractiveToolAction(
  skillName: string,
  toolName: string,
  toolCall: ToolCall,
  reasoning: string | undefined,
): CheckpointAction {
  return {
    type: "interactiveTool",
    reasoning,
    skillName,
    toolName,
    args: toolCall.args,
  }
}

function createRetryAction(
  newMessages: Message[],
  reasoning: string | undefined,
): CheckpointAction {
  const lastMessage = newMessages[newMessages.length - 1]
  const textPart = lastMessage?.contents.find((c) => c.type === "textPart")
  return {
    type: "retry",
    reasoning,
    error: "No tool call or result found",
    message: textPart?.text ?? "",
  }
}

function createBaseToolAction(
  toolName: string,
  toolCall: ToolCall,
  toolResult: ToolResult,
  reasoning: string | undefined,
): CheckpointAction {
  const args = toolCall.args as Record<string, unknown>
  const resultContents = toolResult.result
  const errorText = getErrorFromResult(resultContents)

  switch (toolName) {
    case "attemptCompletion": {
      const remainingTodos = parseRemainingTodosFromResult(resultContents)
      return {
        type: "attemptCompletion",
        reasoning,
        remainingTodos,
        error: errorText,
      }
    }

    case "todo": {
      const todos = parseTodosFromResult(resultContents)
      return {
        type: "todo",
        reasoning,
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
        reasoning,
        error: errorText,
      }

    case "readImageFile":
      return {
        type: "readImageFile",
        reasoning,
        path: String(args["path"] ?? ""),
        mimeType: parseStringField(resultContents, "mimeType"),
        size: parseNumberField(resultContents, "size"),
        error: errorText,
      }

    case "readPdfFile":
      return {
        type: "readPdfFile",
        reasoning,
        path: String(args["path"] ?? ""),
        mimeType: parseStringField(resultContents, "mimeType"),
        size: parseNumberField(resultContents, "size"),
        error: errorText,
      }

    case "readTextFile":
      return {
        type: "readTextFile",
        reasoning,
        path: String(args["path"] ?? ""),
        content: parseStringField(resultContents, "content"),
        from: typeof args["from"] === "number" ? args["from"] : undefined,
        to: typeof args["to"] === "number" ? args["to"] : undefined,
        error: errorText,
      }

    case "editTextFile":
      return {
        type: "editTextFile",
        reasoning,
        path: String(args["path"] ?? ""),
        newText: String(args["newText"] ?? ""),
        oldText: String(args["oldText"] ?? ""),
        error: errorText,
      }

    case "appendTextFile":
      return {
        type: "appendTextFile",
        reasoning,
        path: String(args["path"] ?? ""),
        text: String(args["text"] ?? ""),
        error: errorText,
      }

    case "writeTextFile":
      return {
        type: "writeTextFile",
        reasoning,
        path: String(args["path"] ?? ""),
        text: String(args["text"] ?? ""),
        error: errorText,
      }

    case "deleteFile":
      return {
        type: "deleteFile",
        reasoning,
        path: String(args["path"] ?? ""),
        error: errorText,
      }

    case "deleteDirectory":
      return {
        type: "deleteDirectory",
        reasoning,
        path: String(args["path"] ?? ""),
        recursive: typeof args["recursive"] === "boolean" ? args["recursive"] : undefined,
        error: errorText,
      }

    case "moveFile":
      return {
        type: "moveFile",
        reasoning,
        source: String(args["source"] ?? ""),
        destination: String(args["destination"] ?? ""),
        error: errorText,
      }

    case "getFileInfo":
      return {
        type: "getFileInfo",
        reasoning,
        path: String(args["path"] ?? ""),
        info: parseFileInfoFromResult(resultContents),
        error: errorText,
      }

    case "createDirectory":
      return {
        type: "createDirectory",
        reasoning,
        path: String(args["path"] ?? ""),
        error: errorText,
      }

    case "listDirectory":
      return {
        type: "listDirectory",
        reasoning,
        path: String(args["path"] ?? ""),
        items: parseListDirectoryFromResult(resultContents),
        error: errorText,
      }

    case "exec":
      return {
        type: "exec",
        reasoning,
        command: String(args["command"] ?? ""),
        args: Array.isArray(args["args"]) ? args["args"].map(String) : [],
        cwd: String(args["cwd"] ?? ""),
        output: parseStringField(resultContents, "output"),
        error: errorText,
        stdout: parseStringField(resultContents, "stdout"),
        stderr: parseStringField(resultContents, "stderr"),
      }

    default:
      return createGeneralToolAction(BASE_SKILL_PREFIX, toolName, toolCall, toolResult, reasoning)
  }
}

function createGeneralToolAction(
  skillName: string,
  toolName: string,
  toolCall: ToolCall,
  toolResult: ToolResult,
  reasoning: string | undefined,
): CheckpointAction {
  const errorText = getErrorFromResult(toolResult.result)
  return {
    type: "generalTool",
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
