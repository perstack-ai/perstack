import type { Expert } from "./expert.js"
import type { InteractiveSkill, McpSseSkill, McpStdioSkill } from "./skill.js"

export type SkillType = "mcp" | "interactive" | "delegate"
export interface McpSkillManagerParams {
  type: "mcp"
  skill: McpStdioSkill | McpSseSkill
  env: Record<string, string>
}
export interface InteractiveSkillManagerParams {
  type: "interactive"
  interactiveSkill: InteractiveSkill
}
export interface DelegateSkillManagerParams {
  type: "delegate"
  expert: Expert
}
export type SkillManagerParams =
  | McpSkillManagerParams
  | InteractiveSkillManagerParams
  | DelegateSkillManagerParams

export interface ToolDefinition {
  skillName: string
  name: string
  description?: string
  inputSchema: { [k: string]: unknown }
  interactive: boolean
}

export type CallToolResultContent = {
  type: "text" | "image" | "resource"
  text?: string
  data?: string
  mimeType?: string
  resource?: Resource
}
export type Resource = {
  mimeType?: string
  text?: string
  blob?: string
}
