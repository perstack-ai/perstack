import type {
  FileInlinePart,
  ImageInlinePart,
  LockfileToolDefinition,
  McpSseSkill,
  McpStdioSkill,
  RunEvent,
  RuntimeEvent,
  SkillType,
  TextPart,
  ToolDefinition,
} from "@perstack/core"
import { BaseSkillManager } from "./base.js"
import { isBaseSkill, shouldUseBundledBase } from "./helpers.js"
import { InMemoryBaseSkillManager } from "./in-memory-base.js"
import { McpSkillManager } from "./mcp.js"

export interface LockfileSkillManagerOptions {
  skill: McpStdioSkill | McpSseSkill
  toolDefinitions: LockfileToolDefinition[]
  env: Record<string, string>
  jobId: string
  runId: string
  eventListener?: (event: RunEvent | RuntimeEvent) => void
  perstackBaseSkillCommand?: string[]
}

export class LockfileSkillManager extends BaseSkillManager {
  readonly name: string
  readonly type: SkillType = "mcp"
  readonly lazyInit = true
  override readonly skill: McpStdioSkill | McpSseSkill
  private _cachedToolDefinitions: ToolDefinition[]
  private _realManager?: BaseSkillManager
  private _env: Record<string, string>
  private _perstackBaseSkillCommand?: string[]

  constructor(options: LockfileSkillManagerOptions) {
    super(options.jobId, options.runId, options.eventListener)
    this.name = options.skill.name
    this.skill = options.skill
    this._env = options.env
    this._perstackBaseSkillCommand = options.perstackBaseSkillCommand
    this._cachedToolDefinitions = options.toolDefinitions.map((def) => ({
      skillName: def.skillName,
      name: def.name,
      description: def.description,
      inputSchema: def.inputSchema,
      interactive: false,
    }))
  }

  protected override async _doInit(): Promise<void> {
    // No-op: tool definitions are already cached from lockfile
  }

  override async getToolDefinitions(): Promise<ToolDefinition[]> {
    return this._filterTools(this._cachedToolDefinitions)
  }

  protected override _filterTools(tools: ToolDefinition[]): ToolDefinition[] {
    const omit = this.skill.omit ?? []
    const pick = this.skill.pick ?? []
    return tools
      .filter((tool) => (omit.length > 0 ? !omit.includes(tool.name) : true))
      .filter((tool) => (pick.length > 0 ? pick.includes(tool.name) : true))
  }

  private async _ensureRealManager(): Promise<BaseSkillManager> {
    if (this._realManager) {
      return this._realManager
    }
    const useBundledBase =
      this.skill.type === "mcpStdioSkill" &&
      isBaseSkill(this.skill) &&
      shouldUseBundledBase(this.skill, this._perstackBaseSkillCommand)
    if (useBundledBase && this.skill.type === "mcpStdioSkill") {
      this._realManager = new InMemoryBaseSkillManager(
        this.skill,
        this._jobId,
        this._runId,
        this._eventListener,
      )
    } else {
      this._realManager = new McpSkillManager(
        this.skill,
        this._env,
        this._jobId,
        this._runId,
        this._eventListener,
      )
    }
    await this._realManager.init()
    return this._realManager
  }

  override async callTool(
    toolName: string,
    input: Record<string, unknown>,
  ): Promise<Array<TextPart | ImageInlinePart | FileInlinePart>> {
    const realManager = await this._ensureRealManager()
    return realManager.callTool(toolName, input)
  }

  override async close(): Promise<void> {
    if (this._realManager) {
      await this._realManager.close()
    }
  }
}
