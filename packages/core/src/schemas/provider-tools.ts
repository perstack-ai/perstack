import { z } from "zod"

export const anthropicProviderToolNameSchema = z.enum(["webSearch", "webFetch", "codeExecution"])
export type AnthropicProviderToolName = z.infer<typeof anthropicProviderToolNameSchema>

export const builtinAnthropicSkillSchema = z.object({
  type: z.literal("builtin"),
  skillId: z.enum(["pdf", "docx", "pptx", "xlsx"]),
})
export type BuiltinAnthropicSkill = z.infer<typeof builtinAnthropicSkillSchema>

export const customAnthropicSkillSchema = z.object({
  type: z.literal("custom"),
  name: z.string().min(1),
  definition: z.string().min(1),
})
export type CustomAnthropicSkill = z.infer<typeof customAnthropicSkillSchema>

export const anthropicProviderSkillSchema = z.discriminatedUnion("type", [
  builtinAnthropicSkillSchema,
  customAnthropicSkillSchema,
])
export type AnthropicProviderSkill = z.infer<typeof anthropicProviderSkillSchema>

export const openaiProviderToolNameSchema = z.enum([
  "webSearch",
  "fileSearch",
  "codeInterpreter",
  "imageGeneration",
])
export type OpenAIProviderToolName = z.infer<typeof openaiProviderToolNameSchema>

export const googleProviderToolNameSchema = z.enum([
  "googleSearch",
  "codeExecution",
  "urlContext",
  "fileSearch",
  "googleMaps",
])
export type GoogleProviderToolName = z.infer<typeof googleProviderToolNameSchema>

export const webSearchOptionsSchema = z.object({
  maxUses: z.number().int().positive().optional(),
  allowedDomains: z.array(z.string()).optional(),
})

export const webFetchOptionsSchema = z.object({
  maxUses: z.number().int().positive().optional(),
})

export const fileSearchOptionsSchema = z.object({
  vectorStoreIds: z.array(z.string()).optional(),
  maxNumResults: z.number().int().positive().optional(),
})

export const providerToolOptionsSchema = z
  .object({
    webSearch: webSearchOptionsSchema.optional(),
    webFetch: webFetchOptionsSchema.optional(),
    fileSearch: fileSearchOptionsSchema.optional(),
  })
  .optional()
export type ProviderToolOptions = z.infer<typeof providerToolOptionsSchema>

export function hasCustomProviderSkills(skills?: AnthropicProviderSkill[]): boolean {
  return skills?.some((skill) => skill.type === "custom") ?? false
}
