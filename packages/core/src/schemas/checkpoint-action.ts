import { z } from "zod"
import type { MessagePart } from "./message-part.js"
import { messagePartSchema } from "./message-part.js"

/** Init action - Initial checkpoint before any action is taken */
export interface CheckpointActionInit {
  type: "init"
}

export const checkpointActionInitSchema = z.object({
  type: z.literal("init"),
})
checkpointActionInitSchema satisfies z.ZodType<CheckpointActionInit>

/** Retry action - generation failed and will be retried */
export interface CheckpointActionRetry {
  type: "retry"
  error: string
  message: string
}

export const checkpointActionRetrySchema = z.object({
  type: z.literal("retry"),
  error: z.string(),
  message: z.string(),
})
checkpointActionRetrySchema satisfies z.ZodType<CheckpointActionRetry>

/** Attempt completion action - Expert signaling task completion */
export interface CheckpointActionAttemptCompletion {
  type: "attemptCompletion"
  result: string
  error?: string
}

export const checkpointActionAttemptCompletionSchema = z.object({
  type: z.literal("attemptCompletion"),
  result: z.string(),
  error: z.string().optional(),
})
checkpointActionAttemptCompletionSchema satisfies z.ZodType<CheckpointActionAttemptCompletion>

/** Think action - Expert using the think tool */
export interface CheckpointActionThink {
  type: "think"
  thought: string
  error?: string
}

export const checkpointActionThinkSchema = z.object({
  type: z.literal("think"),
  thought: z.string(),
  error: z.string().optional(),
})
checkpointActionThinkSchema satisfies z.ZodType<CheckpointActionThink>

/** Todo action - Expert managing todo list */
export interface CheckpointActionTodo {
  type: "todo"
  newTodos: string[]
  completedTodos: number[]
  todos: { id: number; title: string; completed: boolean }[]
  error?: string
}

export const checkpointActionTodoSchema = z.object({
  type: z.literal("todo"),
  newTodos: z.array(z.string()),
  completedTodos: z.array(z.number()),
  todos: z.array(
    z.object({
      id: z.number(),
      title: z.string(),
      completed: z.boolean(),
    }),
  ),
  error: z.string().optional(),
})
checkpointActionTodoSchema satisfies z.ZodType<CheckpointActionTodo>

/** Read image file action */
export interface CheckpointActionReadImageFile {
  type: "readImageFile"
  path: string
  mimeType?: string
  size?: number
  error?: string
}

export const checkpointActionReadImageFileSchema = z.object({
  type: z.literal("readImageFile"),
  path: z.string(),
  mimeType: z.string().optional(),
  size: z.number().optional(),
  error: z.string().optional(),
})
checkpointActionReadImageFileSchema satisfies z.ZodType<CheckpointActionReadImageFile>

/** Read PDF file action */
export interface CheckpointActionReadPdfFile {
  type: "readPdfFile"
  path: string
  mimeType?: string
  size?: number
  error?: string
}

export const checkpointActionReadPdfFileSchema = z.object({
  type: z.literal("readPdfFile"),
  path: z.string(),
  mimeType: z.string().optional(),
  size: z.number().optional(),
  error: z.string().optional(),
})
checkpointActionReadPdfFileSchema satisfies z.ZodType<CheckpointActionReadPdfFile>

/** Read text file action */
export interface CheckpointActionReadTextFile {
  type: "readTextFile"
  path: string
  content: string
  from?: number
  to?: number
  error?: string
}

export const checkpointActionReadTextFileSchema = z.object({
  type: z.literal("readTextFile"),
  path: z.string(),
  content: z.string(),
  from: z.number().optional(),
  to: z.number().optional(),
  error: z.string().optional(),
})
checkpointActionReadTextFileSchema satisfies z.ZodType<CheckpointActionReadTextFile>

/** Edit text file action */
export interface CheckpointActionEditTextFile {
  type: "editTextFile"
  path: string
  newText?: string
  oldText?: string
  error?: string
}

export const checkpointActionEditTextFileSchema = z.object({
  type: z.literal("editTextFile"),
  path: z.string(),
  newText: z.string().optional(),
  oldText: z.string().optional(),
  error: z.string().optional(),
})
checkpointActionEditTextFileSchema satisfies z.ZodType<CheckpointActionEditTextFile>

/** Append text file action */
export interface CheckpointActionAppendTextFile {
  type: "appendTextFile"
  path: string
  text: string
  error?: string
}

export const checkpointActionAppendTextFileSchema = z.object({
  type: z.literal("appendTextFile"),
  path: z.string(),
  text: z.string(),
  error: z.string().optional(),
})
checkpointActionAppendTextFileSchema satisfies z.ZodType<CheckpointActionAppendTextFile>

/** Delete file action */
export interface CheckpointActionDeleteFile {
  type: "deleteFile"
  path: string
  error?: string
}

export const checkpointActionDeleteFileSchema = z.object({
  type: z.literal("deleteFile"),
  path: z.string(),
  error: z.string().optional(),
})
checkpointActionDeleteFileSchema satisfies z.ZodType<CheckpointActionDeleteFile>

/** Move file action */
export interface CheckpointActionMoveFile {
  type: "moveFile"
  source: string
  destination: string
  error?: string
}

export const checkpointActionMoveFileSchema = z.object({
  type: z.literal("moveFile"),
  source: z.string(),
  destination: z.string(),
  error: z.string().optional(),
})
checkpointActionMoveFileSchema satisfies z.ZodType<CheckpointActionMoveFile>

/** Get file info action */
export interface CheckpointActionGetFileInfo {
  type: "getFileInfo"
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
  permissions: {
    readable: boolean
    writable: boolean
    executable: boolean
  }
  error?: string
}

export const checkpointActionGetFileInfoSchema = z.object({
  type: z.literal("getFileInfo"),
  path: z.string(),
  exists: z.boolean(),
  absolutePath: z.string(),
  name: z.string(),
  directory: z.string(),
  extension: z.string().optional(),
  mimeType: z.string().optional(),
  size: z.number(),
  sizeFormatted: z.string(),
  created: z.string(),
  modified: z.string(),
  accessed: z.string(),
  permissions: z.object({
    readable: z.boolean(),
    writable: z.boolean(),
    executable: z.boolean(),
  }),
  error: z.string().optional(),
})
checkpointActionGetFileInfoSchema satisfies z.ZodType<CheckpointActionGetFileInfo>

/** Write text file action */
export interface CheckpointActionWriteTextFile {
  type: "writeTextFile"
  path: string
  text: string
  error?: string
}

export const checkpointActionWriteTextFileSchema = z.object({
  type: z.literal("writeTextFile"),
  path: z.string(),
  text: z.string(),
  error: z.string().optional(),
})
checkpointActionWriteTextFileSchema satisfies z.ZodType<CheckpointActionWriteTextFile>

/** Create directory action */
export interface CheckpointActionCreateDirectory {
  type: "createDirectory"
  path: string
  error?: string
}

export const checkpointActionCreateDirectorySchema = z.object({
  type: z.literal("createDirectory"),
  path: z.string(),
  error: z.string().optional(),
})
checkpointActionCreateDirectorySchema satisfies z.ZodType<CheckpointActionCreateDirectory>

/** List directory action */
export interface CheckpointActionListDirectory {
  type: "listDirectory"
  path: string
  items: {
    name: string
    path: string
    type: "directory" | "file"
    size: number
    modified: string
  }[]
  error?: string
}

export const checkpointActionListDirectorySchema = z.object({
  type: z.literal("listDirectory"),
  path: z.string(),
  items: z.array(
    z.object({
      name: z.string(),
      path: z.string(),
      type: z.union([z.literal("directory"), z.literal("file")]),
      size: z.number(),
      modified: z.string(),
    }),
  ),
  error: z.string().optional(),
})
checkpointActionListDirectorySchema satisfies z.ZodType<CheckpointActionListDirectory>

/** Test URL action */
export interface CheckpointActionTestUrl {
  type: "testUrl"
  results: {
    url: string
    status: number
    title: string
    description: string
  }[]
  error?: string
}

export const checkpointActionTestUrlSchema = z.object({
  type: z.literal("testUrl"),
  results: z.array(
    z.object({
      url: z.string(),
      status: z.number(),
      title: z.string(),
      description: z.string(),
    }),
  ),
  error: z.string().optional(),
})
checkpointActionTestUrlSchema satisfies z.ZodType<CheckpointActionTestUrl>

/** Delegate action - Expert delegating to another Expert */
export interface CheckpointActionDelegate {
  type: "delegate"
  delegateTo: {
    expertKey: string
    query: string
  }[]
  error?: string
}

export const checkpointActionDelegateSchema = z.object({
  type: z.literal("delegate"),
  delegateTo: z.array(
    z.object({
      expertKey: z.string(),
      query: z.string(),
    }),
  ),
  error: z.string().optional(),
})
checkpointActionDelegateSchema satisfies z.ZodType<CheckpointActionDelegate>

/** Interactive tool action - Tool requiring user interaction */
export interface CheckpointActionInteractiveTool {
  type: "interactiveTool"
  skillName: string
  toolName: string
  args: Record<string, unknown>
  error?: string
}

export const checkpointActionInteractiveToolSchema = z.object({
  type: z.literal("interactiveTool"),
  skillName: z.string(),
  toolName: z.string(),
  args: z.record(z.string(), z.unknown()),
  error: z.string().optional(),
})
checkpointActionInteractiveToolSchema satisfies z.ZodType<CheckpointActionInteractiveTool>

/** General tool action - Any tool not specifically handled */
export interface CheckpointActionGeneralTool {
  type: "generalTool"
  skillName: string
  toolName: string
  args: Record<string, unknown>
  result: MessagePart[]
  error?: string
}

export const checkpointActionGeneralToolSchema = z.object({
  type: z.literal("generalTool"),
  skillName: z.string(),
  toolName: z.string(),
  args: z.record(z.string(), z.unknown()),
  result: z.array(messagePartSchema),
  error: z.string().optional(),
})
checkpointActionGeneralToolSchema satisfies z.ZodType<CheckpointActionGeneralTool>

/** Error action - When action interpretation fails */
export interface CheckpointActionError {
  type: "error"
  error?: string
}

export const checkpointActionErrorSchema = z.object({
  type: z.literal("error"),
  error: z.string().optional(),
})
checkpointActionErrorSchema satisfies z.ZodType<CheckpointActionError>

/** Union of all checkpoint action types */
export type CheckpointAction =
  | CheckpointActionInit
  | CheckpointActionRetry
  | CheckpointActionAttemptCompletion
  | CheckpointActionThink
  | CheckpointActionTodo
  | CheckpointActionReadImageFile
  | CheckpointActionReadPdfFile
  | CheckpointActionReadTextFile
  | CheckpointActionEditTextFile
  | CheckpointActionAppendTextFile
  | CheckpointActionDeleteFile
  | CheckpointActionMoveFile
  | CheckpointActionGetFileInfo
  | CheckpointActionWriteTextFile
  | CheckpointActionCreateDirectory
  | CheckpointActionListDirectory
  | CheckpointActionTestUrl
  | CheckpointActionDelegate
  | CheckpointActionInteractiveTool
  | CheckpointActionGeneralTool
  | CheckpointActionError

export const checkpointActionSchema = z.discriminatedUnion("type", [
  checkpointActionInitSchema,
  checkpointActionRetrySchema,
  checkpointActionAttemptCompletionSchema,
  checkpointActionThinkSchema,
  checkpointActionTodoSchema,
  checkpointActionReadImageFileSchema,
  checkpointActionReadPdfFileSchema,
  checkpointActionReadTextFileSchema,
  checkpointActionEditTextFileSchema,
  checkpointActionAppendTextFileSchema,
  checkpointActionDeleteFileSchema,
  checkpointActionMoveFileSchema,
  checkpointActionGetFileInfoSchema,
  checkpointActionWriteTextFileSchema,
  checkpointActionCreateDirectorySchema,
  checkpointActionListDirectorySchema,
  checkpointActionTestUrlSchema,
  checkpointActionDelegateSchema,
  checkpointActionInteractiveToolSchema,
  checkpointActionGeneralToolSchema,
  checkpointActionErrorSchema,
])
checkpointActionSchema satisfies z.ZodType<CheckpointAction>
