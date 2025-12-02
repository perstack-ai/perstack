import { z } from "zod"
import { apiApplicationSchema } from "./application.js"
import { apiExpertJobSchema } from "./expert-job.js"
import { apiWorkspaceItemSchema } from "./workspace-item.js"

export const apiWorkspaceInstanceSchema = z.object({
  type: z.literal("workspaceInstance"),
  id: z.cuid2(),
  applicationId: z.cuid2(),
  application: apiApplicationSchema,
  expertJob: apiExpertJobSchema,
  createdAt: z.iso.datetime().transform((date) => new Date(date)),
  updatedAt: z.iso.datetime().transform((date) => new Date(date)),
  items: z.array(apiWorkspaceItemSchema),
  countItems: z.number(),
  envVariables: z.array(z.string()),
  envSecrets: z.array(z.string()),
})
export type ApiWorkspaceInstance = z.infer<typeof apiWorkspaceInstanceSchema>
