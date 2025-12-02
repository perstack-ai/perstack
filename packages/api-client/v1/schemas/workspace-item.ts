import { z } from "zod"

export const apiWorkspaceItemOwnerSchema = z.union([z.literal("user"), z.literal("expert")])
export type ApiWorkspaceItemOwner = z.infer<typeof apiWorkspaceItemOwnerSchema>

export const apiWorkspaceItemLifecycleSchema = z.union([
  z.literal("application"),
  z.literal("expertJob"),
])
export type ApiWorkspaceItemLifecycle = z.infer<typeof apiWorkspaceItemLifecycleSchema>

export const apiWorkspaceItemPermissionSchema = z.union([
  z.literal("readOnly"),
  z.literal("readWrite"),
])
export type ApiWorkspaceItemPermission = z.infer<typeof apiWorkspaceItemPermissionSchema>

export const apiBaseWorkspaceItemSchema = z.object({
  id: z.cuid2(),
  owner: apiWorkspaceItemOwnerSchema,
  lifecycle: apiWorkspaceItemLifecycleSchema,
  permission: apiWorkspaceItemPermissionSchema,
  path: z.string().min(1).max(1024),
  createdAt: z.iso.datetime().transform((date) => new Date(date)),
  updatedAt: z.iso.datetime().transform((date) => new Date(date)),
})

export const apiWorkspaceItemDirectorySchema = apiBaseWorkspaceItemSchema.extend({
  type: z.literal("workspaceItemDirectory"),
})
export type ApiWorkspaceItemDirectory = z.infer<typeof apiWorkspaceItemDirectorySchema>

export const apiWorkspaceItemFileSchema = apiBaseWorkspaceItemSchema.extend({
  type: z.literal("workspaceItemFile"),
  key: z.string().min(1).max(1024),
  mimeType: z.string().max(256),
  size: z.number().min(0),
})
export type ApiWorkspaceItemFile = z.infer<typeof apiWorkspaceItemFileSchema>

export const apiWorkspaceItemSchema = z.discriminatedUnion("type", [
  apiWorkspaceItemDirectorySchema,
  apiWorkspaceItemFileSchema,
])
export type ApiWorkspaceItem = z.infer<typeof apiWorkspaceItemSchema>
