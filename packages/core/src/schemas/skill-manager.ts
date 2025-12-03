import type { Expert } from "./expert.js"
import type { InteractiveSkill, McpSseSkill, McpStdioSkill } from "./skill.js"

/** Discriminator for skill manager types */
export type SkillType = "mcp" | "interactive" | "delegate"

/** Parameters for initializing an MCP-based skill manager (stdio or SSE) */
export interface McpSkillManagerParams {
  type: "mcp"
  /** MCP skill configuration */
  skill: McpStdioSkill | McpSseSkill
  /** Environment variables to pass to the MCP server */
  env: Record<string, string>
}

/** Parameters for initializing an interactive skill manager */
export interface InteractiveSkillManagerParams {
  type: "interactive"
  /** Interactive skill configuration */
  interactiveSkill: InteractiveSkill
}

/** Parameters for initializing a delegate skill manager */
export interface DelegateSkillManagerParams {
  type: "delegate"
  /** Expert to delegate to */
  expert: Expert
}

/** Union type for all skill manager initialization parameters */
export type SkillManagerParams =
  | McpSkillManagerParams
  | InteractiveSkillManagerParams
  | DelegateSkillManagerParams

/** Definition of a tool exposed by a skill manager */
export interface ToolDefinition {
  /** Name of the skill providing this tool */
  skillName: string
  /** Tool name */
  name: string
  /** Human-readable description */
  description?: string
  /** JSON Schema for tool input */
  inputSchema: { [k: string]: unknown }
  /** Whether this tool requires human interaction */
  interactive: boolean
}

/** Content returned from a tool call */
export type CallToolResultContent = {
  /** Content type */
  type: "text" | "image" | "resource"
  /** Text content (when type is "text") */
  text?: string
  /** Base64-encoded data (when type is "image") */
  data?: string
  /** MIME type of the content */
  mimeType?: string
  /** Resource reference (when type is "resource") */
  resource?: Resource
}

/** MCP resource reference */
export type Resource = {
  /** MIME type of the resource */
  mimeType?: string
  /** Text content */
  text?: string
  /** Base64-encoded binary content */
  blob?: string
}
