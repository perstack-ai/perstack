import { z } from "zod"
import { maxSkillNameLength, maxSkillToolNameLength } from "../constants/constants.js"
import type { MessagePart } from "./message-part.js"
import { messagePartSchema } from "./message-part.js"

/** Result returned from a tool call */
export interface ToolResult {
  /** Unique identifier for this result */
  id: string
  /** Name of the skill that provided the tool */
  skillName: string
  /** Name of the tool that was called */
  toolName: string
  /** Content parts returned by the tool */
  result: MessagePart[]
}

export const toolResultSchema = z.object({
  id: z.string().min(1).max(255),
  skillName: z.string().min(1).max(maxSkillNameLength),
  toolName: z.string().min(1).max(maxSkillToolNameLength),
  result: z.array(messagePartSchema),
})
toolResultSchema satisfies z.ZodType<ToolResult>
