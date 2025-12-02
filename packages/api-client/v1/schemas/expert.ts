import {
  expertKeyRegex,
  expertNameRegex,
  expertSchema,
  expertVersionRegex,
  maxExpertDescriptionLength,
  maxExpertInstructionLength,
  maxExpertKeyLength,
  maxExpertNameLength,
  maxExpertVersionTagLength,
  tagNameRegex,
} from "@perstack/core"
import { z } from "zod"
import { apiApplicationSchema } from "./application.js"
import { apiRuntimeVersionSchema } from "./common.js"
import { apiOrganizationSchema } from "./organization.js"
import { apiSkillNameSchema, apiSkillSchema } from "./skill.js"

const apiTagNameSchema = z
  .string()
  .pipe(z.string().min(1, "Tag is required."))
  .pipe(z.string().max(maxExpertVersionTagLength, "Tag is too long."))
  .pipe(z.string().regex(tagNameRegex, "Invalid tag format. (e.g. latest)"))

const apiExpertVersionSchema = z
  .string()
  .pipe(z.string().min(1, "Version is required."))
  .pipe(z.string().max(maxExpertVersionTagLength, "Version is too long."))
  .pipe(z.string().regex(expertVersionRegex, "Invalid version format. (e.g. 1.0.0)"))

const apiMetadataSchema = z.object({
  id: z.cuid2(),
  minRuntimeVersion: apiRuntimeVersionSchema,
  owner: z.object({
    name: apiOrganizationSchema.shape.name,
    organizationId: z.cuid2(),
    createdAt: z.iso.datetime().transform((date) => new Date(date)),
  }),
  createdAt: z.iso.datetime().transform((date) => new Date(date)),
  updatedAt: z.iso.datetime().transform((date) => new Date(date)),
})

export const apiBaseExpertSchema = expertSchema
  .omit({ skills: true, delegates: true, tags: true, instruction: true })
  .extend({
    key: z
      .string()
      .pipe(z.string().min(1, "Key is required."))
      .pipe(z.string().max(maxExpertKeyLength, "Key is too long."))
      .pipe(z.string().regex(expertKeyRegex, "Invalid key format. (e.g. my-expert)")),
    name: z
      .string()
      .pipe(z.string().min(1, "Name is required."))
      .pipe(z.string().max(maxExpertNameLength, "Name is too long."))
      .pipe(z.string().regex(expertNameRegex, "Invalid name format. (e.g. my-expert)")),
    description: z
      .string()
      .min(1, "Description is required")
      .max(maxExpertDescriptionLength, "Description must be less than 2048 characters"),
  })
  .merge(apiMetadataSchema)
export const apiRegistryExpertSchema = apiBaseExpertSchema.extend({
  type: z.literal("registryExpert"),
  version: apiExpertVersionSchema,
  status: z.union([z.literal("available"), z.literal("deprecated"), z.literal("disabled")]),
  instruction: z
    .string()
    .min(1, "Instruction is required")
    .max(maxExpertInstructionLength, "Instruction must be less than 20480 characters"),
  skills: z.record(apiSkillNameSchema, apiSkillSchema),
  delegates: z.array(apiBaseExpertSchema.shape.key),
  tags: z.array(apiTagNameSchema),
})
export type ApiRegistryExpert = z.infer<typeof apiRegistryExpertSchema>

export const apiStudioExpertSchema = apiBaseExpertSchema.extend({
  type: z.literal("studioExpert"),
  instruction: z
    .string()
    .min(1, "Instruction is required")
    .max(maxExpertInstructionLength, "Instruction must be less than 20480 characters"),
  skills: z.record(apiSkillNameSchema, apiSkillSchema),
  delegates: z.array(apiBaseExpertSchema.shape.key),
  forkFrom: apiBaseExpertSchema.shape.key.optional(),
  application: apiApplicationSchema,
})
export type ApiStudioExpert = z.infer<typeof apiStudioExpertSchema>

export const apiExpertDigestSchema = apiBaseExpertSchema.extend({
  type: z.literal("expertDigest"),
  version: apiExpertVersionSchema.optional(),
  tags: z.array(apiTagNameSchema),
})
export type ApiExpertDigest = z.infer<typeof apiExpertDigestSchema>

export const apiExpertSchema = z.discriminatedUnion("type", [
  apiExpertDigestSchema,
  apiRegistryExpertSchema,
  apiStudioExpertSchema,
])
export type ApiExpert = z.infer<typeof apiExpertSchema>
