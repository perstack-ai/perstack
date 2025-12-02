import { z } from "zod"
import { maxSkillNameLength, maxSkillToolNameLength } from "../constants/constants.js"

export const toolCallSchema = z.object({
  id: z.string().min(1).max(255),
  skillName: z.string().min(1).max(maxSkillNameLength),
  toolName: z.string().min(1).max(maxSkillToolNameLength),
  args: z.record(z.string().min(1), z.unknown()),
})
export type ToolCall = z.infer<typeof toolCallSchema>
