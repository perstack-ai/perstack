import {
  checkpointSchema,
  instructionMessageSchema,
  maxCheckpointToolCallIdLength,
  maxSkillNameLength,
  maxSkillToolNameLength,
  messagePartSchema,
  messageSchema,
  toolCallSchema,
  toolMessageSchema,
  toolResultSchema,
  usageSchema,
  userMessageSchema,
} from "@perstack/core"
import { z } from "zod"
import { apiExpertDigestSchema } from "./expert.js"
import { apiWorkspaceItemSchema } from "./workspace-item.js"

export const apiCheckpointStatusSchema = z.union([
  z.literal("init"),
  z.literal("proceeding"),
  z.literal("completed"),
  z.literal("stoppedByInteractiveTool"),
  z.literal("stoppedByDelegate"),
  z.literal("stoppedByExceededMaxSteps"),
  z.literal("stoppedByError"),
])
export type ApiCheckpointStatus = z.infer<typeof apiCheckpointStatusSchema>

const apiBaseCheckpointActionSchema = z.object({ error: z.string().optional() })
export const apiCheckpointActionRetrySchema = apiBaseCheckpointActionSchema.extend({
  type: z.literal("retry"),
  error: z.string(),
  message: z.string(),
})
export const apiCheckpointActionAttemptCompletionSchema = apiBaseCheckpointActionSchema.extend({
  type: z.literal("attemptCompletion"),
  result: z.string(),
})
export const apiCheckpointActionThinkSchema = apiBaseCheckpointActionSchema.extend({
  type: z.literal("think"),
  thought: z.string(),
})
export const apiCheckpointActionTodoSchema = apiBaseCheckpointActionSchema.extend({
  type: z.literal("todo"),
  newTodos: z.array(z.string()),
  completedTodos: z.array(z.number()),
  todos: z.array(z.object({ id: z.number(), title: z.string(), completed: z.boolean() })),
})
export const apiCheckpointActionReadImageFileSchema = apiBaseCheckpointActionSchema.extend({
  type: z.literal("readImageFile"),
  path: z.string(),
  mimeType: z.string().optional(),
  size: z.number().optional(),
})
export const apiCheckpointActionReadPdfFileSchema = apiBaseCheckpointActionSchema.extend({
  type: z.literal("readPdfFile"),
  path: z.string(),
  mimeType: z.string().optional(),
  size: z.number().optional(),
})
export const apiCheckpointActionReadTextFileSchema = apiBaseCheckpointActionSchema.extend({
  type: z.literal("readTextFile"),
  path: z.string(),
  content: z.string(),
  from: z.number().optional(),
  to: z.number().optional(),
})
export const apiCheckpointActionEditTextFileSchema = apiBaseCheckpointActionSchema.extend({
  type: z.literal("editTextFile"),
  path: z.string(),
  newText: z.string().optional(),
  oldText: z.string().optional(),
})
export const apiCheckpointActionAppendTextFileSchema = apiBaseCheckpointActionSchema.extend({
  type: z.literal("appendTextFile"),
  path: z.string(),
  text: z.string(),
})
export const apiCheckpointActionDeleteFileSchema = apiBaseCheckpointActionSchema.extend({
  type: z.literal("deleteFile"),
  path: z.string(),
})
export const apiCheckpointActionMoveFileSchema = apiBaseCheckpointActionSchema.extend({
  type: z.literal("moveFile"),
  source: z.string(),
  destination: z.string(),
})
export const apiCheckpointActionGetFileInfoSchema = apiBaseCheckpointActionSchema.extend({
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
  created: z.date(),
  modified: z.date(),
  accessed: z.date(),
  permissions: z.object({ readable: z.boolean(), writable: z.boolean(), executable: z.boolean() }),
  workspaceItem: apiWorkspaceItemSchema.optional(),
})
export const apiCheckpointActionWriteTextFileSchema = apiBaseCheckpointActionSchema.extend({
  type: z.literal("writeTextFile"),
  path: z.string(),
  text: z.string(),
})
export const apiCheckpointActionCreateDirectorySchema = apiBaseCheckpointActionSchema.extend({
  type: z.literal("createDirectory"),
  path: z.string(),
})
export const apiCheckpointActionListDirectorySchema = apiBaseCheckpointActionSchema.extend({
  type: z.literal("listDirectory"),
  path: z.string(),
  items: z.array(
    z.object({
      name: z.string(),
      path: z.string(),
      type: z.union([z.literal("directory"), z.literal("file")]),
      size: z.number(),
      modified: z.date(),
    }),
  ),
})
export const apiCheckpointActionTestUrlSchema = apiBaseCheckpointActionSchema.extend({
  type: z.literal("testUrl"),
  results: z.array(
    z.object({ url: z.string(), status: z.number(), title: z.string(), description: z.string() }),
  ),
})
export const apiCheckpointActionDelegateSchema = apiBaseCheckpointActionSchema.extend({
  type: z.literal("delegate"),
  delegateTo: apiExpertDigestSchema,
  query: z.string(),
})
export const apiCheckpointActionInteractiveTool = apiBaseCheckpointActionSchema.extend({
  type: z.literal("interactiveTool"),
  skillName: z.string().min(1).max(256),
  toolName: z.string().min(1).max(256),
  args: z.record(z.string().min(1).max(256), z.unknown()),
})
export const apiCheckpointActionGeneralToolSchema = apiBaseCheckpointActionSchema.extend({
  type: z.literal("generalTool"),
  skillName: z.string().min(1).max(256),
  toolName: z.string().min(1).max(256),
  args: z.record(z.string().min(1).max(256), z.unknown()),
  result: z.array(messagePartSchema),
})
export const apiCheckpointActionErrorSchema = apiBaseCheckpointActionSchema.extend({
  type: z.literal("error"),
})
export const apiCheckpointActionSchema = z.discriminatedUnion("type", [
  apiCheckpointActionRetrySchema,
  apiCheckpointActionAttemptCompletionSchema,
  apiCheckpointActionThinkSchema,
  apiCheckpointActionTodoSchema,
  apiCheckpointActionReadImageFileSchema,
  apiCheckpointActionReadPdfFileSchema,
  apiCheckpointActionReadTextFileSchema,
  apiCheckpointActionEditTextFileSchema,
  apiCheckpointActionAppendTextFileSchema,
  apiCheckpointActionDeleteFileSchema,
  apiCheckpointActionMoveFileSchema,
  apiCheckpointActionGetFileInfoSchema,
  apiCheckpointActionWriteTextFileSchema,
  apiCheckpointActionCreateDirectorySchema,
  apiCheckpointActionListDirectorySchema,
  apiCheckpointActionTestUrlSchema,
  apiCheckpointActionDelegateSchema,
  apiCheckpointActionInteractiveTool,
  apiCheckpointActionGeneralToolSchema,
  apiCheckpointActionErrorSchema,
])
export type ApiCheckpointAction = z.infer<typeof apiCheckpointActionSchema>
export const apiCheckpointSchema = checkpointSchema.omit({ expert: true }).extend({
  type: z.literal("checkpoint"),
  id: z.cuid2(),
  action: apiCheckpointActionSchema,
  expertJobId: z.cuid2(),
  status: apiCheckpointStatusSchema,
  expert: apiExpertDigestSchema,
  skillName: z.string().min(1).max(maxSkillNameLength).optional(),
  toolName: z.string().min(1).max(maxSkillToolNameLength).optional(),
  delegateTo: z
    .object({
      expert: apiExpertDigestSchema,
      toolCallId: z.string().min(1).max(maxCheckpointToolCallIdLength),
      toolName: z.string().min(1).max(maxSkillToolNameLength),
    })
    .optional(),
  delegatedBy: z
    .object({
      expert: apiExpertDigestSchema,
      toolCallId: z.string().min(1).max(maxCheckpointToolCallIdLength),
      toolName: z.string().min(1).max(maxSkillToolNameLength),
      checkpointId: z.cuid2(),
    })
    .optional(),
  inputMessages: z
    .array(z.union([instructionMessageSchema, userMessageSchema, toolMessageSchema]))
    .optional(),
  messages: z.array(messageSchema),
  newMessages: z.array(messageSchema),
  toolCall: toolCallSchema.optional(),
  toolResult: toolResultSchema.optional(),
  usage: usageSchema,
  contextWindow: z.number().min(0),
  contextWindowUsage: z.number().min(0),
  startedAt: z.iso.datetime().transform((date) => new Date(date)),
  finishedAt: z.iso
    .datetime()
    .transform((date) => new Date(date))
    .optional(),
})
export type ApiCheckpoint = z.infer<typeof apiCheckpointSchema>
