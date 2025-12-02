import { z } from "zod"
import {
  fileBinaryPartSchema,
  fileInlinePartSchema,
  fileUrlPartSchema,
  imageBinaryPartSchema,
  imageInlinePartSchema,
  imageUrlPartSchema,
  textPartSchema,
  toolCallPartSchema,
  toolResultPartSchema,
} from "./message-part.js"

/**
 * Message Schemas
 */
const baseMessageSchema = z.object({
  id: z.string(),
})

export const instructionMessageSchema = baseMessageSchema.extend({
  type: z.literal("instructionMessage"),
  contents: z.array(textPartSchema),
  cache: z.boolean().optional(),
})
export type InstructionMessage = z.infer<typeof instructionMessageSchema>

export const userMessageSchema = baseMessageSchema.extend({
  type: z.literal("userMessage"),
  contents: z.array(
    z.union([
      textPartSchema,
      imageUrlPartSchema,
      imageInlinePartSchema,
      imageBinaryPartSchema,
      fileUrlPartSchema,
      fileInlinePartSchema,
      fileBinaryPartSchema,
    ]),
  ),
  cache: z.boolean().optional(),
})
export type UserMessage = z.infer<typeof userMessageSchema>

export const expertMessageSchema = baseMessageSchema.extend({
  type: z.literal("expertMessage"),
  contents: z.array(z.union([textPartSchema, toolCallPartSchema])),
  cache: z.boolean().optional(),
})
export type ExpertMessage = z.infer<typeof expertMessageSchema>

export const toolMessageSchema = baseMessageSchema.extend({
  type: z.literal("toolMessage"),
  contents: z.array(toolResultPartSchema),
  cache: z.boolean().optional(),
})
export type ToolMessage = z.infer<typeof toolMessageSchema>

export const messageSchema = z.union([
  instructionMessageSchema,
  userMessageSchema,
  expertMessageSchema,
  toolMessageSchema,
])
export type Message = z.infer<typeof messageSchema>
