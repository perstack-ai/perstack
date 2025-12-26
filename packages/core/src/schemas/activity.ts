import { z } from "zod"
import type { MessagePart } from "./message-part.js"
import { messagePartSchema } from "./message-part.js"

/** Base fields shared by all activities */
interface BaseActivity {
  /** Unique activity ID */
  id: string
  /** Expert key that executed this activity */
  expertKey: string
  /** Run ID this activity belongs to */
  runId: string
  /** Previous activity ID for daisy chain within the same run */
  previousActivityId?: string
  /** Delegation info if this run was delegated from another */
  delegatedBy?: {
    expertKey: string
    runId: string
  }
  /** LLM's reasoning/thinking process before executing this action */
  reasoning?: string
}

const baseActivitySchema = z.object({
  id: z.string(),
  expertKey: z.string(),
  runId: z.string(),
  previousActivityId: z.string().optional(),
  delegatedBy: z
    .object({
      expertKey: z.string(),
      runId: z.string(),
    })
    .optional(),
  reasoning: z.string().optional(),
})

/** Query activity - User input that starts a run */
export interface QueryActivity extends BaseActivity {
  type: "query"
  text: string
}

export const queryActivitySchema = baseActivitySchema.extend({
  type: z.literal("query"),
  text: z.string(),
})
queryActivitySchema satisfies z.ZodType<QueryActivity>

/** Retry activity - generation failed and will be retried */
export interface RetryActivity extends BaseActivity {
  type: "retry"
  error: string
  message: string
}

export const retryActivitySchema = baseActivitySchema.extend({
  type: z.literal("retry"),
  error: z.string(),
  message: z.string(),
})
retryActivitySchema satisfies z.ZodType<RetryActivity>

/** Complete activity - Run completed successfully with final result */
export interface CompleteActivity extends BaseActivity {
  type: "complete"
  text: string
}

export const completeActivitySchema = baseActivitySchema.extend({
  type: z.literal("complete"),
  text: z.string(),
})
completeActivitySchema satisfies z.ZodType<CompleteActivity>

/** Error activity - When run stopped by error */
export interface ErrorActivity extends BaseActivity {
  type: "error"
  error?: string
  errorName?: string
  isRetryable?: boolean
}

export const errorActivitySchema = baseActivitySchema.extend({
  type: z.literal("error"),
  error: z.string().optional(),
  errorName: z.string().optional(),
  isRetryable: z.boolean().optional(),
})
errorActivitySchema satisfies z.ZodType<ErrorActivity>

/** Attempt completion activity - Expert signaling task completion */
export interface AttemptCompletionActivity extends BaseActivity {
  type: "attemptCompletion"
  remainingTodos?: Array<{ id: number; title: string; completed: boolean }>
  error?: string
}

export const attemptCompletionActivitySchema = baseActivitySchema.extend({
  type: z.literal("attemptCompletion"),
  remainingTodos: z
    .array(z.object({ id: z.number(), title: z.string(), completed: z.boolean() }))
    .optional(),
  error: z.string().optional(),
})
attemptCompletionActivitySchema satisfies z.ZodType<AttemptCompletionActivity>

/** Todo activity - Expert managing todo list */
export interface TodoActivity extends BaseActivity {
  type: "todo"
  newTodos?: string[]
  completedTodos?: number[]
  todos: Array<{ id: number; title: string; completed: boolean }>
  error?: string
}

export const todoActivitySchema = baseActivitySchema.extend({
  type: z.literal("todo"),
  newTodos: z.array(z.string()).optional(),
  completedTodos: z.array(z.number()).optional(),
  todos: z.array(z.object({ id: z.number(), title: z.string(), completed: z.boolean() })),
  error: z.string().optional(),
})
todoActivitySchema satisfies z.ZodType<TodoActivity>

/** Clear todo activity - Expert clearing the todo list */
export interface ClearTodoActivity extends BaseActivity {
  type: "clearTodo"
  error?: string
}

export const clearTodoActivitySchema = baseActivitySchema.extend({
  type: z.literal("clearTodo"),
  error: z.string().optional(),
})
clearTodoActivitySchema satisfies z.ZodType<ClearTodoActivity>

/** Read image file activity */
export interface ReadImageFileActivity extends BaseActivity {
  type: "readImageFile"
  path: string
  mimeType?: string
  size?: number
  error?: string
}

export const readImageFileActivitySchema = baseActivitySchema.extend({
  type: z.literal("readImageFile"),
  path: z.string(),
  mimeType: z.string().optional(),
  size: z.number().optional(),
  error: z.string().optional(),
})
readImageFileActivitySchema satisfies z.ZodType<ReadImageFileActivity>

/** Read PDF file activity */
export interface ReadPdfFileActivity extends BaseActivity {
  type: "readPdfFile"
  path: string
  mimeType?: string
  size?: number
  error?: string
}

export const readPdfFileActivitySchema = baseActivitySchema.extend({
  type: z.literal("readPdfFile"),
  path: z.string(),
  mimeType: z.string().optional(),
  size: z.number().optional(),
  error: z.string().optional(),
})
readPdfFileActivitySchema satisfies z.ZodType<ReadPdfFileActivity>

/** Read text file activity */
export interface ReadTextFileActivity extends BaseActivity {
  type: "readTextFile"
  path: string
  content?: string
  from?: number
  to?: number
  error?: string
}

export const readTextFileActivitySchema = baseActivitySchema.extend({
  type: z.literal("readTextFile"),
  path: z.string(),
  content: z.string().optional(),
  from: z.number().optional(),
  to: z.number().optional(),
  error: z.string().optional(),
})
readTextFileActivitySchema satisfies z.ZodType<ReadTextFileActivity>

/** Edit text file activity */
export interface EditTextFileActivity extends BaseActivity {
  type: "editTextFile"
  path: string
  newText: string
  oldText: string
  error?: string
}

export const editTextFileActivitySchema = baseActivitySchema.extend({
  type: z.literal("editTextFile"),
  path: z.string(),
  newText: z.string(),
  oldText: z.string(),
  error: z.string().optional(),
})
editTextFileActivitySchema satisfies z.ZodType<EditTextFileActivity>

/** Append text file activity */
export interface AppendTextFileActivity extends BaseActivity {
  type: "appendTextFile"
  path: string
  text: string
  error?: string
}

export const appendTextFileActivitySchema = baseActivitySchema.extend({
  type: z.literal("appendTextFile"),
  path: z.string(),
  text: z.string(),
  error: z.string().optional(),
})
appendTextFileActivitySchema satisfies z.ZodType<AppendTextFileActivity>

/** Write text file activity */
export interface WriteTextFileActivity extends BaseActivity {
  type: "writeTextFile"
  path: string
  text: string
  error?: string
}

export const writeTextFileActivitySchema = baseActivitySchema.extend({
  type: z.literal("writeTextFile"),
  path: z.string(),
  text: z.string(),
  error: z.string().optional(),
})
writeTextFileActivitySchema satisfies z.ZodType<WriteTextFileActivity>

/** Delete file activity */
export interface DeleteFileActivity extends BaseActivity {
  type: "deleteFile"
  path: string
  error?: string
}

export const deleteFileActivitySchema = baseActivitySchema.extend({
  type: z.literal("deleteFile"),
  path: z.string(),
  error: z.string().optional(),
})
deleteFileActivitySchema satisfies z.ZodType<DeleteFileActivity>

/** Delete directory activity */
export interface DeleteDirectoryActivity extends BaseActivity {
  type: "deleteDirectory"
  path: string
  recursive?: boolean
  error?: string
}

export const deleteDirectoryActivitySchema = baseActivitySchema.extend({
  type: z.literal("deleteDirectory"),
  path: z.string(),
  recursive: z.boolean().optional(),
  error: z.string().optional(),
})
deleteDirectoryActivitySchema satisfies z.ZodType<DeleteDirectoryActivity>

/** Move file activity */
export interface MoveFileActivity extends BaseActivity {
  type: "moveFile"
  source: string
  destination: string
  error?: string
}

export const moveFileActivitySchema = baseActivitySchema.extend({
  type: z.literal("moveFile"),
  source: z.string(),
  destination: z.string(),
  error: z.string().optional(),
})
moveFileActivitySchema satisfies z.ZodType<MoveFileActivity>

/** Get file info activity */
export interface GetFileInfoActivity extends BaseActivity {
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

export const getFileInfoActivitySchema = baseActivitySchema.extend({
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
getFileInfoActivitySchema satisfies z.ZodType<GetFileInfoActivity>

/** Create directory activity */
export interface CreateDirectoryActivity extends BaseActivity {
  type: "createDirectory"
  path: string
  error?: string
}

export const createDirectoryActivitySchema = baseActivitySchema.extend({
  type: z.literal("createDirectory"),
  path: z.string(),
  error: z.string().optional(),
})
createDirectoryActivitySchema satisfies z.ZodType<CreateDirectoryActivity>

/** List directory activity */
export interface ListDirectoryActivity extends BaseActivity {
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

export const listDirectoryActivitySchema = baseActivitySchema.extend({
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
listDirectoryActivitySchema satisfies z.ZodType<ListDirectoryActivity>

/** Exec activity - Command execution */
export interface ExecActivity extends BaseActivity {
  type: "exec"
  command: string
  args: string[]
  cwd: string
  output?: string
  error?: string
  stdout?: string
  stderr?: string
}

export const execActivitySchema = baseActivitySchema.extend({
  type: z.literal("exec"),
  command: z.string(),
  args: z.array(z.string()),
  cwd: z.string(),
  output: z.string().optional(),
  error: z.string().optional(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
})
execActivitySchema satisfies z.ZodType<ExecActivity>

/** Delegate activity - Expert delegating to another Expert */
export interface DelegateActivity extends BaseActivity {
  type: "delegate"
  delegateExpertKey: string
  query: string
}

export const delegateActivitySchema = baseActivitySchema.extend({
  type: z.literal("delegate"),
  delegateExpertKey: z.string(),
  query: z.string(),
})
delegateActivitySchema satisfies z.ZodType<DelegateActivity>

/** Delegation complete activity - All delegated experts have returned */
export interface DelegationCompleteActivity extends BaseActivity {
  type: "delegationComplete"
  count: number
}

export const delegationCompleteActivitySchema = baseActivitySchema.extend({
  type: z.literal("delegationComplete"),
  count: z.number(),
})
delegationCompleteActivitySchema satisfies z.ZodType<DelegationCompleteActivity>

/** Interactive tool activity - Tool requiring user interaction */
export interface InteractiveToolActivity extends BaseActivity {
  type: "interactiveTool"
  skillName: string
  toolName: string
  args: Record<string, unknown>
}

export const interactiveToolActivitySchema = baseActivitySchema.extend({
  type: z.literal("interactiveTool"),
  skillName: z.string(),
  toolName: z.string(),
  args: z.record(z.string(), z.unknown()),
})
interactiveToolActivitySchema satisfies z.ZodType<InteractiveToolActivity>

/** General tool activity - Any other tool call */
export interface GeneralToolActivity extends BaseActivity {
  type: "generalTool"
  skillName: string
  toolName: string
  args: Record<string, unknown>
  result?: MessagePart[]
  error?: string
}

export const generalToolActivitySchema = baseActivitySchema.extend({
  type: z.literal("generalTool"),
  skillName: z.string(),
  toolName: z.string(),
  args: z.record(z.string(), z.unknown()),
  result: z.array(messagePartSchema).optional(),
  error: z.string().optional(),
})
generalToolActivitySchema satisfies z.ZodType<GeneralToolActivity>

/** Union of all activity types */
export type Activity =
  | QueryActivity
  | RetryActivity
  | CompleteActivity
  | ErrorActivity
  | AttemptCompletionActivity
  | TodoActivity
  | ClearTodoActivity
  | ReadImageFileActivity
  | ReadPdfFileActivity
  | ReadTextFileActivity
  | EditTextFileActivity
  | AppendTextFileActivity
  | WriteTextFileActivity
  | DeleteFileActivity
  | DeleteDirectoryActivity
  | MoveFileActivity
  | GetFileInfoActivity
  | CreateDirectoryActivity
  | ListDirectoryActivity
  | ExecActivity
  | DelegateActivity
  | DelegationCompleteActivity
  | InteractiveToolActivity
  | GeneralToolActivity

export const activitySchema = z.discriminatedUnion("type", [
  queryActivitySchema,
  retryActivitySchema,
  completeActivitySchema,
  errorActivitySchema,
  attemptCompletionActivitySchema,
  todoActivitySchema,
  clearTodoActivitySchema,
  readImageFileActivitySchema,
  readPdfFileActivitySchema,
  readTextFileActivitySchema,
  editTextFileActivitySchema,
  appendTextFileActivitySchema,
  writeTextFileActivitySchema,
  deleteFileActivitySchema,
  deleteDirectoryActivitySchema,
  moveFileActivitySchema,
  getFileInfoActivitySchema,
  createDirectoryActivitySchema,
  listDirectoryActivitySchema,
  execActivitySchema,
  delegateActivitySchema,
  delegationCompleteActivitySchema,
  interactiveToolActivitySchema,
  generalToolActivitySchema,
])
activitySchema satisfies z.ZodType<Activity>

/** Activity type discriminator */
export type ActivityType = Activity["type"]
