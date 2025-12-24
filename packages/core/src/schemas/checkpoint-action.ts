import { z } from "zod"
import type { MessagePart } from "./message-part.js"
import { messagePartSchema } from "./message-part.js"

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
  remainingTodos?: Array<{ id: number; title: string; completed: boolean }>
  error?: string
}

export const checkpointActionAttemptCompletionSchema = z.object({
  type: z.literal("attemptCompletion"),
  remainingTodos: z
    .array(z.object({ id: z.number(), title: z.string(), completed: z.boolean() }))
    .optional(),
  error: z.string().optional(),
})
checkpointActionAttemptCompletionSchema satisfies z.ZodType<CheckpointActionAttemptCompletion>

/** Todo action - Expert managing todo list */
export interface CheckpointActionTodo {
  type: "todo"
  newTodos?: string[]
  completedTodos?: number[]
  todos: Array<{ id: number; title: string; completed: boolean }>
  error?: string
}

export const checkpointActionTodoSchema = z.object({
  type: z.literal("todo"),
  newTodos: z.array(z.string()).optional(),
  completedTodos: z.array(z.number()).optional(),
  todos: z.array(z.object({ id: z.number(), title: z.string(), completed: z.boolean() })),
  error: z.string().optional(),
})
checkpointActionTodoSchema satisfies z.ZodType<CheckpointActionTodo>

/** Clear todo action - Expert clearing the todo list */
export interface CheckpointActionClearTodo {
  type: "clearTodo"
  error?: string
}

export const checkpointActionClearTodoSchema = z.object({
  type: z.literal("clearTodo"),
  error: z.string().optional(),
})
checkpointActionClearTodoSchema satisfies z.ZodType<CheckpointActionClearTodo>

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
  content?: string
  from?: number
  to?: number
  error?: string
}

export const checkpointActionReadTextFileSchema = z.object({
  type: z.literal("readTextFile"),
  path: z.string(),
  content: z.string().optional(),
  from: z.number().optional(),
  to: z.number().optional(),
  error: z.string().optional(),
})
checkpointActionReadTextFileSchema satisfies z.ZodType<CheckpointActionReadTextFile>

/** Edit text file action */
export interface CheckpointActionEditTextFile {
  type: "editTextFile"
  path: string
  newText: string
  oldText: string
  error?: string
}

export const checkpointActionEditTextFileSchema = z.object({
  type: z.literal("editTextFile"),
  path: z.string(),
  newText: z.string(),
  oldText: z.string(),
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

/** Delete directory action */
export interface CheckpointActionDeleteDirectory {
  type: "deleteDirectory"
  path: string
  recursive?: boolean
  error?: string
}

export const checkpointActionDeleteDirectorySchema = z.object({
  type: z.literal("deleteDirectory"),
  path: z.string(),
  recursive: z.boolean().optional(),
  error: z.string().optional(),
})
checkpointActionDeleteDirectorySchema satisfies z.ZodType<CheckpointActionDeleteDirectory>

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
  info?: {
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
  error?: string
}

export const checkpointActionGetFileInfoSchema = z.object({
  type: z.literal("getFileInfo"),
  path: z.string(),
  info: z
    .object({
      exists: z.boolean(),
      name: z.string(),
      directory: z.string(),
      extension: z.string().nullable(),
      type: z.enum(["file", "directory"]),
      mimeType: z.string().nullable(),
      size: z.number(),
      sizeFormatted: z.string(),
      created: z.string(),
      modified: z.string(),
      accessed: z.string(),
    })
    .optional(),
  error: z.string().optional(),
})
checkpointActionGetFileInfoSchema satisfies z.ZodType<CheckpointActionGetFileInfo>

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
  items?: Array<{
    name: string
    path: string
    type: "file" | "directory"
    size: number
    modified: string
  }>
  error?: string
}

export const checkpointActionListDirectorySchema = z.object({
  type: z.literal("listDirectory"),
  path: z.string(),
  items: z
    .array(
      z.object({
        name: z.string(),
        path: z.string(),
        type: z.enum(["file", "directory"]),
        size: z.number(),
        modified: z.string(),
      }),
    )
    .optional(),
  error: z.string().optional(),
})
checkpointActionListDirectorySchema satisfies z.ZodType<CheckpointActionListDirectory>

/** Exec action - Command execution */
export interface CheckpointActionExec {
  type: "exec"
  command: string
  args: string[]
  cwd: string
  output?: string
  error?: string
  stdout?: string
  stderr?: string
}

export const checkpointActionExecSchema = z.object({
  type: z.literal("exec"),
  command: z.string(),
  args: z.array(z.string()),
  cwd: z.string(),
  output: z.string().optional(),
  error: z.string().optional(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
})
checkpointActionExecSchema satisfies z.ZodType<CheckpointActionExec>

/** Delegate action - Expert delegating to another Expert */
export interface CheckpointActionDelegate {
  type: "delegate"
  delegateTo: Array<{
    expertKey: string
    query: string
  }>
}

export const checkpointActionDelegateSchema = z.object({
  type: z.literal("delegate"),
  delegateTo: z.array(
    z.object({
      expertKey: z.string(),
      query: z.string(),
    }),
  ),
})
checkpointActionDelegateSchema satisfies z.ZodType<CheckpointActionDelegate>

/** Interactive tool action - Tool requiring user interaction */
export interface CheckpointActionInteractiveTool {
  type: "interactiveTool"
  skillName: string
  toolName: string
  args: Record<string, unknown>
}

export const checkpointActionInteractiveToolSchema = z.object({
  type: z.literal("interactiveTool"),
  skillName: z.string(),
  toolName: z.string(),
  args: z.record(z.string(), z.unknown()),
})
checkpointActionInteractiveToolSchema satisfies z.ZodType<CheckpointActionInteractiveTool>

/** General tool action - Any other tool call */
export interface CheckpointActionGeneralTool {
  type: "generalTool"
  skillName: string
  toolName: string
  args: Record<string, unknown>
  result?: MessagePart[]
  error?: string
}

export const checkpointActionGeneralToolSchema = z.object({
  type: z.literal("generalTool"),
  skillName: z.string(),
  toolName: z.string(),
  args: z.record(z.string(), z.unknown()),
  result: z.array(messagePartSchema).optional(),
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
  | CheckpointActionRetry
  | CheckpointActionAttemptCompletion
  | CheckpointActionTodo
  | CheckpointActionClearTodo
  | CheckpointActionReadImageFile
  | CheckpointActionReadPdfFile
  | CheckpointActionReadTextFile
  | CheckpointActionEditTextFile
  | CheckpointActionAppendTextFile
  | CheckpointActionWriteTextFile
  | CheckpointActionDeleteFile
  | CheckpointActionDeleteDirectory
  | CheckpointActionMoveFile
  | CheckpointActionGetFileInfo
  | CheckpointActionCreateDirectory
  | CheckpointActionListDirectory
  | CheckpointActionExec
  | CheckpointActionDelegate
  | CheckpointActionInteractiveTool
  | CheckpointActionGeneralTool
  | CheckpointActionError

export const checkpointActionSchema = z.discriminatedUnion("type", [
  checkpointActionRetrySchema,
  checkpointActionAttemptCompletionSchema,
  checkpointActionTodoSchema,
  checkpointActionClearTodoSchema,
  checkpointActionReadImageFileSchema,
  checkpointActionReadPdfFileSchema,
  checkpointActionReadTextFileSchema,
  checkpointActionEditTextFileSchema,
  checkpointActionAppendTextFileSchema,
  checkpointActionWriteTextFileSchema,
  checkpointActionDeleteFileSchema,
  checkpointActionDeleteDirectorySchema,
  checkpointActionMoveFileSchema,
  checkpointActionGetFileInfoSchema,
  checkpointActionCreateDirectorySchema,
  checkpointActionListDirectorySchema,
  checkpointActionExecSchema,
  checkpointActionDelegateSchema,
  checkpointActionInteractiveToolSchema,
  checkpointActionGeneralToolSchema,
  checkpointActionErrorSchema,
])
checkpointActionSchema satisfies z.ZodType<CheckpointAction>
