import { z } from "zod"

function isPrivateOrLocalIP(hostname: string): boolean {
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "0.0.0.0"
  ) {
    return true
  }
  const ipv4Match = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/)
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number)
    if (a === 10) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 169 && b === 254) return true
    if (a === 127) return true
  }
  return false
}
const sseEndpointSchema = z
  .string()
  .url()
  .refine(
    (url) => {
      try {
        const parsed = new URL(url)
        if (parsed.protocol !== "https:") return false
        if (isPrivateOrLocalIP(parsed.hostname)) return false
        return true
      } catch {
        return false
      }
    },
    { message: "Endpoint must be a public HTTPS URL" },
  )

/** MCP skill using stdio transport */
export interface McpStdioSkill {
  type: "mcpStdioSkill"
  /** Skill name (derived from key) */
  name: string
  /** Human-readable description */
  description?: string
  /** Usage rules for the LLM */
  rule?: string
  /** Tool names to include (whitelist) */
  pick: string[]
  /** Tool names to exclude (blacklist) */
  omit: string[]
  /** Command to execute (e.g., "npx") */
  command: string
  /** Package name for npx/uvx */
  packageName?: string
  /** Additional arguments */
  args: string[]
  /** Environment variables required by this skill */
  requiredEnv: string[]
  /** Whether to delay initialization until first use */
  lazyInit: boolean
}

export const mcpStdioSkillSchema = z.object({
  type: z.literal("mcpStdioSkill"),
  name: z.string(),
  description: z.string().optional(),
  rule: z.string().optional(),
  pick: z.array(z.string()).optional().default([]),
  omit: z.array(z.string()).optional().default([]),
  command: z.string(),
  packageName: z.string().optional(),
  args: z.array(z.string()).optional().default([]),
  requiredEnv: z.array(z.string()).optional().default([]),
  lazyInit: z.boolean().optional().default(true),
})
mcpStdioSkillSchema satisfies z.ZodType<McpStdioSkill>

/** MCP skill using SSE transport */
export interface McpSseSkill {
  type: "mcpSseSkill"
  /** Skill name (derived from key) */
  name: string
  /** Human-readable description */
  description?: string
  /** Usage rules for the LLM */
  rule?: string
  /** Tool names to include (whitelist) */
  pick: string[]
  /** Tool names to exclude (blacklist) */
  omit: string[]
  /** SSE endpoint URL */
  endpoint: string
}

export const mcpSseSkillSchema = z.object({
  type: z.literal("mcpSseSkill"),
  name: z.string(),
  description: z.string().optional(),
  rule: z.string().optional(),
  pick: z.array(z.string()).optional().default([]),
  omit: z.array(z.string()).optional().default([]),
  endpoint: sseEndpointSchema,
})
mcpSseSkillSchema satisfies z.ZodType<McpSseSkill>

/** Definition of an interactive tool within an interactive skill */
export interface InteractiveTool {
  /** Tool name */
  name: string
  /** Human-readable description */
  description?: string
  /** JSON Schema for tool input as a string */
  inputJsonSchema: string
}

export const interactiveToolSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  inputJsonSchema: z.string(),
})
interactiveToolSchema satisfies z.ZodType<InteractiveTool>

/** Skill that requires human interaction to complete tool calls */
export interface InteractiveSkill {
  type: "interactiveSkill"
  /** Skill name (derived from key) */
  name: string
  /** Human-readable description */
  description?: string
  /** Usage rules for the LLM */
  rule?: string
  /** Map of tool name to tool definition */
  tools: Record<string, InteractiveTool>
}

export const interactiveSkillSchema = z.object({
  type: z.literal("interactiveSkill"),
  name: z.string(),
  description: z.string().optional(),
  rule: z.string().optional(),
  tools: z.record(z.string(), interactiveToolSchema.omit({ name: true })).transform((tools) => {
    return Object.fromEntries(
      Object.entries(tools).map(([key, toolWithoutName]) => [
        key,
        interactiveToolSchema.parse({ ...toolWithoutName, name: key }),
      ]),
    )
  }),
})

/** All possible skill types */
export type Skill = McpStdioSkill | McpSseSkill | InteractiveSkill

export const skillSchema = z.discriminatedUnion("type", [
  mcpStdioSkillSchema,
  mcpSseSkillSchema,
  interactiveSkillSchema,
])
