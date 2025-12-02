import { z } from "zod"
import { apiApplicationSchema } from "./application.js"
import { apiWorkspaceItemSchema } from "./workspace-item.js"

export const apiWorkspaceSchema = z.object({
  type: z.literal("workspace"),
  id: z.cuid2(),
  applicationId: z.cuid2(),
  application: apiApplicationSchema,
  createdAt: z.iso.datetime().transform((date) => new Date(date)),
  updatedAt: z.iso.datetime().transform((date) => new Date(date)),
  items: z.array(apiWorkspaceItemSchema),
  countItems: z.number(),
  envVariables: z.array(z.string()),
  envSecrets: z.array(z.string()),
  countWorkspaceInstances: z.number(),
})
export type ApiWorkspace = z.infer<typeof apiWorkspaceSchema>
