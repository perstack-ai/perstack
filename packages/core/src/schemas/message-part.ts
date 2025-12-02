import { z } from "zod"

/**
 * Message Part Schemas
 */
export const basePartSchema = z.object({
  id: z.string(),
})
export type BasePart = z.infer<typeof basePartSchema>

export const textPartSchema = basePartSchema.extend({
  type: z.literal("textPart"),
  text: z.string(),
})
export type TextPart = z.infer<typeof textPartSchema>

export const imageUrlPartSchema = basePartSchema.extend({
  type: z.literal("imageUrlPart"),
  url: z.url(),
  mimeType: z.string(),
})
export type ImageUrlPart = z.infer<typeof imageUrlPartSchema>

export const imageInlinePartSchema = basePartSchema.extend({
  type: z.literal("imageInlinePart"),
  encodedData: z.string(),
  mimeType: z.string(),
})
export type ImageInlinePart = z.infer<typeof imageInlinePartSchema>

export const imageBinaryPartSchema = basePartSchema.extend({
  type: z.literal("imageBinaryPart"),
  data: z.string(),
  mimeType: z.string(),
})
export type ImageBinaryPart = z.infer<typeof imageBinaryPartSchema>

export const fileUrlPartSchema = basePartSchema.extend({
  type: z.literal("fileUrlPart"),
  url: z.string().url(),
  mimeType: z.string(),
})
export type FileUrlPart = z.infer<typeof fileUrlPartSchema>

export const fileInlinePartSchema = basePartSchema.extend({
  type: z.literal("fileInlinePart"),
  encodedData: z.string(),
  mimeType: z.string(),
})
export type FileInlinePart = z.infer<typeof fileInlinePartSchema>

export const fileBinaryPartSchema = basePartSchema.extend({
  type: z.literal("fileBinaryPart"),
  data: z.string(),
  mimeType: z.string(),
})
export type FileBinaryPart = z.infer<typeof fileBinaryPartSchema>

export const toolCallPartSchema = basePartSchema.extend({
  type: z.literal("toolCallPart"),
  toolCallId: z.string(),
  toolName: z.string(),
  args: z.unknown(),
})
export type ToolCallPart = z.infer<typeof toolCallPartSchema>

export const toolResultPartSchema = basePartSchema.extend({
  type: z.literal("toolResultPart"),
  toolCallId: z.string(),
  toolName: z.string(),
  contents: z.array(z.union([textPartSchema, imageInlinePartSchema])),
  isError: z.boolean().optional(),
})
export type ToolResultPart = z.infer<typeof toolResultPartSchema>

export const messagePartSchema = z.discriminatedUnion("type", [
  textPartSchema,
  imageUrlPartSchema,
  imageInlinePartSchema,
  imageBinaryPartSchema,
  fileUrlPartSchema,
  fileInlinePartSchema,
  fileBinaryPartSchema,
  toolCallPartSchema,
  toolResultPartSchema,
])
export type MessagePart = z.infer<typeof messagePartSchema>
