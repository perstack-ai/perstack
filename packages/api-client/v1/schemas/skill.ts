import {
  envNameRegex,
  interactiveSkillSchema,
  maxEnvNameLength,
  maxSkillDescriptionLength,
  maxSkillEndpointLength,
  maxSkillInputJsonSchemaLength,
  maxSkillNameLength,
  maxSkillRuleLength,
  maxSkillToolNameLength,
  mcpSseSkillSchema,
  mcpStdioSkillSchema,
  packageWithVersionRegex,
  urlSafeRegex,
} from "@perstack/core"
import { z } from "zod"

export const apiSkillNameSchema = z
  .string()
  .min(1, "Skill name is required.")
  .max(maxSkillNameLength, "Skill name is too long.")
  .regex(packageWithVersionRegex, "Invalid package name or version.")
export type ApiSkillName = z.infer<typeof apiSkillNameSchema>

export const apiMcpStdioSkillCommandSchema = z.enum(["npx", "uvx"])
export type ApiMcpStdioSkillCommand = z.infer<typeof apiMcpStdioSkillCommandSchema>

export const apiMcpStdioSkillSchema = mcpStdioSkillSchema
  .omit({ name: true, command: true, args: true, packageName: true, lazyInit: true })
  .extend({
    description: z
      .string()
      .min(1, "Description is required.")
      .max(maxSkillDescriptionLength, "Description is too long"),
    rule: z.string().max(maxSkillRuleLength, "Rule is too long").optional(),
    pick: z.array(z.string().max(maxSkillToolNameLength, "Tool name is too long")).optional(),
    omit: z.array(z.string().max(maxSkillToolNameLength, "Tool name is too long")).optional(),
    command: apiMcpStdioSkillCommandSchema,
    packageName: z
      .string()
      .min(1, "Package name is required.")
      .max(maxSkillNameLength, "Package name is too long.")
      .regex(packageWithVersionRegex, "Invalid package name or version."),
    requiredEnv: z
      .array(
        z
          .string()
          .max(maxEnvNameLength, "Environment variable name is too long")
          .regex(envNameRegex, "Invalid environment variable name."),
      )
      .optional(),
  })
export type ApiMcpStdioSkill = z.infer<typeof apiMcpStdioSkillSchema>

export const apiMcpSseSkillSchema = mcpSseSkillSchema.omit({ name: true }).extend({
  description: z
    .string()
    .min(1, "Description is required.")
    .max(maxSkillDescriptionLength, "Description is too long"),
  rule: z.string().max(maxSkillRuleLength, "Rule is too long").optional(),
  pick: z.array(z.string().max(maxSkillToolNameLength, "Tool name is too long")).optional(),
  omit: z.array(z.string().max(maxSkillToolNameLength, "Tool name is too long")).optional(),
  endpoint: z
    .string()
    .min(1, "Endpoint is required.")
    .max(maxSkillEndpointLength, "Endpoint is too long"),
})
export type ApiMcpSseSkill = z.infer<typeof apiMcpSseSkillSchema>
export const apiInteractiveSkillSchema = interactiveSkillSchema
  .omit({ name: true, tools: true })
  .extend({
    description: z
      .string()
      .min(1, "Description is required.")
      .max(maxSkillDescriptionLength, "Description is too long"),
    rule: z.string().max(maxSkillRuleLength, "Rule is too long").optional(),
    tools: z.record(
      z
        .string()
        .min(1, "Tool name is required.")
        .max(maxSkillToolNameLength, "Tool name is too long")
        .regex(urlSafeRegex, "Invalid tool name."),
      z.object({
        description: z
          .string()
          .min(1, "Description is required.")
          .max(maxSkillDescriptionLength, "Description is too long"),
        inputJsonSchema: z
          .string()
          .min(1, "Input JSON schema is required.")
          .max(maxSkillInputJsonSchemaLength, "Input JSON schema is too long"),
      }),
    ),
  })
export type ApiInteractiveSkill = z.infer<typeof apiInteractiveSkillSchema>

export const apiSkillSchema = z.discriminatedUnion("type", [
  apiMcpStdioSkillSchema,
  apiMcpSseSkillSchema,
  apiInteractiveSkillSchema,
])
export type ApiSkill = z.infer<typeof apiSkillSchema>
