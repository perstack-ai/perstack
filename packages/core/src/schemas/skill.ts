import { z } from "zod"

export const mcpStdioSkillSchema = z.object({
  type: z.literal("mcpStdioSkill"),
  name: z.string(),
  description: z.string().optional(),
  rule: z.string().optional(),
  pick: z.array(z.string()).optional().default([]),
  omit: z.array(z.string()).optional().default([]),
  command: z.string(),
  packageName: z.string().optional(),
  args: z.array(z.string()).optional().default([]),
  requiredEnv: z.array(z.string()).optional().default([]),
  lazyInit: z.boolean().optional().default(true),
})
export type McpStdioSkill = z.infer<typeof mcpStdioSkillSchema>

export const mcpSseSkillSchema = z.object({
  type: z.literal("mcpSseSkill"),
  name: z.string(),
  description: z.string().optional(),
  rule: z.string().optional(),
  pick: z.array(z.string()).optional().default([]),
  omit: z.array(z.string()).optional().default([]),
  endpoint: z.string(),
})
export type McpSseSkill = z.infer<typeof mcpSseSkillSchema>

export const interactiveToolSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  inputJsonSchema: z.string(),
})
export type InteractiveTool = z.infer<typeof interactiveToolSchema>

export const interactiveSkillSchema = z.object({
  type: z.literal("interactiveSkill"),
  name: z.string(),
  description: z.string().optional(),
  rule: z.string().optional(),
  tools: z.record(z.string(), interactiveToolSchema.omit({ name: true })).transform((tools) => {
    return Object.fromEntries(
      Object.entries(tools).map(([key, toolWithoutName]) => [
        key,
        interactiveToolSchema.parse({ ...toolWithoutName, name: key }),
      ]),
    )
  }),
})
export type InteractiveSkill = z.infer<typeof interactiveSkillSchema>

export const skillSchema = z.discriminatedUnion("type", [
  mcpStdioSkillSchema,
  mcpSseSkillSchema,
  interactiveSkillSchema,
])
export type Skill = z.infer<typeof skillSchema>
