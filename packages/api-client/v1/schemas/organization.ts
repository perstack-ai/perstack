import { maxOrganizationNameLength, organizationNameRegex } from "@perstack/core"
import { z } from "zod"

export const apiOrganizationStatusSchema = z.union([
  z.literal("active"),
  z.literal("inactive"),
  z.literal("deleted"),
])
export type ApiOrganizationStatus = z.infer<typeof apiOrganizationStatusSchema>

export const apiOrganizationTypeSchema = z.union([
  z.literal("personal"),
  z.literal("personalPlus"),
  z.literal("team"),
  z.literal("serviceAdmin"),
])
export type ApiOrganizationType = z.infer<typeof apiOrganizationTypeSchema>

export const apiOrganizationSchema = z.object({
  type: z.literal("organization"),
  id: z.cuid2(),
  createdAt: z.iso.datetime().transform((date) => new Date(date)),
  updatedAt: z.iso.datetime().transform((date) => new Date(date)),
  name: z
    .string()
    .min(1, "Name is required.")
    .max(maxOrganizationNameLength, "Name is too long.")
    .regex(organizationNameRegex, "Invalid name format. (e.g. my-organization)")
    .optional(),
  nameChangedAt: z.date().optional(),
  status: apiOrganizationStatusSchema,
  organizationType: apiOrganizationTypeSchema,
  maxApplications: z.number().min(0),
  maxApiKeys: z.number().min(0),
  maxStudioExperts: z.number().min(0),
})
export type ApiOrganization = z.infer<typeof apiOrganizationSchema>
