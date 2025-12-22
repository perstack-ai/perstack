import { z } from "zod"
import type { Skill } from "./skill.js"
import { skillSchema } from "./skill.js"

export interface LockfileToolDefinition {
  skillName: string
  name: string
  description?: string
  inputSchema: Record<string, unknown>
}

export const lockfileToolDefinitionSchema = z.object({
  skillName: z.string(),
  name: z.string(),
  description: z.string().optional(),
  inputSchema: z.record(z.string(), z.unknown()),
})

export interface LockfileExpert {
  key: string
  name: string
  version: string
  description?: string
  instruction: string
  skills: Record<string, Skill>
  delegates: string[]
  tags: string[]
  toolDefinitions: LockfileToolDefinition[]
}

export const lockfileExpertSchema = z.object({
  key: z.string(),
  name: z.string(),
  version: z.string(),
  description: z.string().optional(),
  instruction: z.string(),
  skills: z.record(z.string(), skillSchema),
  delegates: z.array(z.string()),
  tags: z.array(z.string()),
  toolDefinitions: z.array(lockfileToolDefinitionSchema),
})

export interface Lockfile {
  version: "1"
  generatedAt: number
  configPath: string
  experts: Record<string, LockfileExpert>
}

export const lockfileSchema = z.object({
  version: z.literal("1"),
  generatedAt: z.number(),
  configPath: z.string(),
  experts: z.record(z.string(), lockfileExpertSchema),
})
