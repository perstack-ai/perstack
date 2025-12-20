import { z } from "zod"
import {
  expertKeyRegex,
  expertNameRegex,
  expertVersionRegex,
  maxExpertNameLength,
  tagNameRegex,
} from "../constants/constants.js"
import type { AnthropicProviderSkill, ProviderToolOptions } from "./provider-tools.js"
import { anthropicProviderSkillSchema, providerToolOptionsSchema } from "./provider-tools.js"
import type { InteractiveSkill, McpSseSkill, McpStdioSkill, Skill } from "./skill.js"
import { interactiveSkillSchema, mcpSseSkillSchema, mcpStdioSkillSchema } from "./skill.js"

/**
 * An Expert definition - an AI agent with specific skills and instructions.
 * Experts can delegate to other Experts and use MCP tools.
 */
export interface Expert {
  /** Unique key identifying this Expert (e.g., "my-expert" or "my-expert@1.0.0") */
  key: string
  /** Display name for the Expert */
  name: string
  /** Semantic version string */
  version: string
  /** Human-readable description of what this Expert does */
  description?: string
  /** System instruction defining the Expert's behavior */
  instruction: string
  /** Map of skill name to skill configuration */
  skills: Record<string, Skill>
  /** List of Expert keys this Expert can delegate to */
  delegates: string[]
  /** Tags for categorization and discovery */
  tags: string[]
  /** Provider-specific tool names to enable (e.g., "webSearch", "codeExecution") */
  providerTools?: string[]
  /** Anthropic Agent Skills configuration */
  providerSkills?: AnthropicProviderSkill[]
  /** Provider tool options (e.g., webSearch maxUses, allowedDomains) */
  providerToolOptions?: ProviderToolOptions
}

type SkillWithoutName =
  | Omit<McpStdioSkill, "name">
  | Omit<McpSseSkill, "name">
  | Omit<InteractiveSkill, "name">

export const expertSchema = z.object({
  key: z.string().regex(expertKeyRegex).min(1),
  name: z.string().regex(expertNameRegex).min(1).max(maxExpertNameLength),
  version: z.string().regex(expertVersionRegex),
  description: z
    .string()
    .min(1)
    .max(1024 * 2)
    .optional(),
  instruction: z
    .string()
    .min(1)
    .max(1024 * 20),
  skills: z
    .record(
      z.string(),
      z.discriminatedUnion("type", [
        mcpStdioSkillSchema.omit({ name: true }),
        mcpSseSkillSchema.omit({ name: true }),
        interactiveSkillSchema.omit({ name: true }),
      ]),
    )
    .optional()
    .default({
      "@perstack/base": {
        type: "mcpStdioSkill",
        description: "Base skill",
        command: "npx",
        args: ["-y", "@perstack/base"],
        pick: [],
        omit: [],
        requiredEnv: [],
        lazyInit: false,
      } satisfies SkillWithoutName,
    })
    .transform((skills) => {
      return Object.fromEntries(
        Object.entries(skills).map(([key, skillWithoutName]) => [
          key,
          z
            .discriminatedUnion("type", [
              mcpStdioSkillSchema,
              mcpSseSkillSchema,
              interactiveSkillSchema,
            ])
            .parse({ ...skillWithoutName, name: key }),
        ]),
      )
    }),
  delegates: z.array(z.string().regex(expertKeyRegex).min(1)).optional().default([]),
  tags: z.array(z.string().regex(tagNameRegex).min(1)).optional().default([]),
  providerTools: z.array(z.string()).optional(),
  providerSkills: z.array(anthropicProviderSkillSchema).optional(),
  providerToolOptions: providerToolOptionsSchema,
})
