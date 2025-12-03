import { z } from "zod"
import { maxSkillNameLength, maxSkillToolNameLength } from "../constants/constants.js"

/** A tool call made by an Expert during execution */
export interface ToolCall {
  /** Unique identifier for this tool call */
  id: string
  /** Name of the skill providing the tool */
  skillName: string
  /** Name of the tool being called */
  toolName: string
  /** Arguments passed to the tool */
  args: Record<string, unknown>
}

export const toolCallSchema = z.object({
  id: z.string().min(1).max(255),
  skillName: z.string().min(1).max(maxSkillNameLength),
  toolName: z.string().min(1).max(maxSkillToolNameLength),
  args: z.record(z.string().min(1), z.unknown()),
})
toolCallSchema satisfies z.ZodType<ToolCall>
