import { z } from "zod"
import {
  expertKeyRegex,
  expertNameRegex,
  expertVersionRegex,
  maxExpertNameLength,
  tagNameRegex,
} from "../constants/constants.js"
import { interactiveSkillSchema, mcpSseSkillSchema, mcpStdioSkillSchema } from "./skill.js"

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
      },
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
})
export type Expert = z.infer<typeof expertSchema>
