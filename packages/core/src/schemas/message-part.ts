import { z } from "zod"

/** Base properties shared by all message parts */
export interface BasePart {
  /** Unique identifier for this part */
  id: string
}

export const basePartSchema = z.object({
  id: z.string(),
})
basePartSchema satisfies z.ZodType<BasePart>

/** Plain text content */
export interface TextPart extends BasePart {
  type: "textPart"
  /** The text content */
  text: string
}

export const textPartSchema = basePartSchema.extend({
  type: z.literal("textPart"),
  text: z.string(),
})
textPartSchema satisfies z.ZodType<TextPart>

/** Image referenced by URL */
export interface ImageUrlPart extends BasePart {
  type: "imageUrlPart"
  /** URL to the image */
  url: string
  /** MIME type of the image */
  mimeType: string
}

export const imageUrlPartSchema = basePartSchema.extend({
  type: z.literal("imageUrlPart"),
  url: z.url(),
  mimeType: z.string(),
})
imageUrlPartSchema satisfies z.ZodType<ImageUrlPart>

/** Image with base64-encoded inline data */
export interface ImageInlinePart extends BasePart {
  type: "imageInlinePart"
  /** Base64-encoded image data */
  encodedData: string
  /** MIME type of the image */
  mimeType: string
}

export const imageInlinePartSchema = basePartSchema.extend({
  type: z.literal("imageInlinePart"),
  encodedData: z.string(),
  mimeType: z.string(),
})
imageInlinePartSchema satisfies z.ZodType<ImageInlinePart>

/** Image with binary data (internal use) */
export interface ImageBinaryPart extends BasePart {
  type: "imageBinaryPart"
  /** Binary data as string */
  data: string
  /** MIME type of the image */
  mimeType: string
}

export const imageBinaryPartSchema = basePartSchema.extend({
  type: z.literal("imageBinaryPart"),
  data: z.string(),
  mimeType: z.string(),
})
imageBinaryPartSchema satisfies z.ZodType<ImageBinaryPart>

/** File referenced by URL */
export interface FileUrlPart extends BasePart {
  type: "fileUrlPart"
  /** URL to the file */
  url: string
  /** MIME type of the file */
  mimeType: string
}

export const fileUrlPartSchema = basePartSchema.extend({
  type: z.literal("fileUrlPart"),
  url: z.string().url(),
  mimeType: z.string(),
})
fileUrlPartSchema satisfies z.ZodType<FileUrlPart>

/** File with base64-encoded inline data */
export interface FileInlinePart extends BasePart {
  type: "fileInlinePart"
  /** Base64-encoded file data */
  encodedData: string
  /** MIME type of the file */
  mimeType: string
}

export const fileInlinePartSchema = basePartSchema.extend({
  type: z.literal("fileInlinePart"),
  encodedData: z.string(),
  mimeType: z.string(),
})
fileInlinePartSchema satisfies z.ZodType<FileInlinePart>

/** File with binary data (internal use) */
export interface FileBinaryPart extends BasePart {
  type: "fileBinaryPart"
  /** Binary data as string */
  data: string
  /** MIME type of the file */
  mimeType: string
}

export const fileBinaryPartSchema = basePartSchema.extend({
  type: z.literal("fileBinaryPart"),
  data: z.string(),
  mimeType: z.string(),
})
fileBinaryPartSchema satisfies z.ZodType<FileBinaryPart>

/** A tool call request from the Expert */
export interface ToolCallPart extends BasePart {
  type: "toolCallPart"
  /** Unique identifier for this tool call */
  toolCallId: string
  /** Name of the tool to call */
  toolName: string
  /** Arguments to pass to the tool */
  args: unknown
}

export const toolCallPartSchema = basePartSchema.extend({
  type: z.literal("toolCallPart"),
  toolCallId: z.string(),
  toolName: z.string(),
  args: z.unknown(),
})
toolCallPartSchema satisfies z.ZodType<ToolCallPart>

/** Result of a tool call */
export interface ToolResultPart extends BasePart {
  type: "toolResultPart"
  /** ID of the tool call this result corresponds to */
  toolCallId: string
  /** Name of the tool that was called */
  toolName: string
  /** Content of the tool result */
  contents: (TextPart | ImageInlinePart | FileInlinePart)[]
  /** Whether the tool call resulted in an error */
  isError?: boolean
}

export const toolResultPartSchema = basePartSchema.extend({
  type: z.literal("toolResultPart"),
  toolCallId: z.string(),
  toolName: z.string(),
  contents: z.array(z.union([textPartSchema, imageInlinePartSchema, fileInlinePartSchema])),
  isError: z.boolean().optional(),
})
toolResultPartSchema satisfies z.ZodType<ToolResultPart>

/** All possible message part types */
export type MessagePart =
  | TextPart
  | ImageUrlPart
  | ImageInlinePart
  | ImageBinaryPart
  | FileUrlPart
  | FileInlinePart
  | FileBinaryPart
  | ToolCallPart
  | ToolResultPart

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
