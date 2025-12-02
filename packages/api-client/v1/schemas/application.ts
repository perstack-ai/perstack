import { z } from "zod"
import { apiOrganizationSchema } from "./organization.js"

export const apiApplicationStatusSchema = z.union([
  z.literal("active"),
  z.literal("inactive"),
  z.literal("deleted"),
])
export type ApiApplicationStatus = z.infer<typeof apiApplicationStatusSchema>

export const apiApplicationSchema = z.object({
  type: z.literal("application"),
  id: z.cuid2(),
  organizationId: z.cuid2(),
  organization: apiOrganizationSchema,
  createdAt: z.iso.datetime().transform((date) => new Date(date)),
  updatedAt: z.iso.datetime().transform((date) => new Date(date)),
  name: z.string().min(1).max(255),
  status: apiApplicationStatusSchema,
})
export type ApiApplication = z.infer<typeof apiApplicationSchema>
