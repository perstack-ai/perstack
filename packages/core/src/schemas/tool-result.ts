import { z } from "zod"
import { maxSkillNameLength, maxSkillToolNameLength } from "../constants/constants.js"
import { messagePartSchema } from "./message-part.js"

export const toolResultSchema = z.object({
  id: z.string().min(1).max(255),
  skillName: z.string().min(1).max(maxSkillNameLength),
  toolName: z.string().min(1).max(maxSkillToolNameLength),
  result: z.array(messagePartSchema),
})
export type ToolResult = z.infer<typeof toolResultSchema>
