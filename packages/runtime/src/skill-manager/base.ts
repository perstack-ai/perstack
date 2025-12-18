import type {
  Expert,
  FileInlinePart,
  ImageInlinePart,
  InteractiveSkill,
  McpSseSkill,
  McpStdioSkill,
  RunEvent,
  RuntimeEvent,
  SkillType,
  TextPart,
  ToolDefinition,
} from "@perstack/core"

export abstract class BaseSkillManager {
  protected _toolDefinitions: ToolDefinition[] = []
  protected _initialized = false
  protected _initializing?: Promise<void>
  abstract readonly name: string
  abstract readonly type: SkillType
  abstract readonly lazyInit: boolean
  readonly skill?: McpStdioSkill | McpSseSkill
  readonly interactiveSkill?: InteractiveSkill
  readonly expert?: Expert
  protected _jobId: string
  protected _runId: string
  protected _eventListener?: (event: RunEvent | RuntimeEvent) => void

  constructor(
    jobId: string,
    runId: string,
    eventListener?: (event: RunEvent | RuntimeEvent) => void,
  ) {
    this._jobId = jobId
    this._runId = runId
    this._eventListener = eventListener
  }

  async init(): Promise<void> {
    if (this._initialized) {
      throw new Error(`Skill ${this.name} is already initialized`)
    }
    if (this._initializing) {
      throw new Error(`Skill ${this.name} is already initializing`)
    }
    const initPromise = this._performInit()
    this._initializing = initPromise
    if (!this.lazyInit) {
      try {
        await initPromise
      } catch (error) {
        this._initialized = false
        this._initializing = undefined
        throw error
      }
    }
  }

  isInitialized(): boolean {
    return this._initialized
  }

  protected async _performInit(): Promise<void> {
    await this._doInit()
    this._initialized = true
    this._initializing = undefined
  }

  protected abstract _doInit(): Promise<void>

  abstract close(): Promise<void>

  async getToolDefinitions(): Promise<ToolDefinition[]> {
    // If initialization is in progress, wait for it to complete
    if (!this.isInitialized() && this._initializing) {
      await this._initializing
    }
    if (!this.isInitialized()) {
      throw new Error(`Skill ${this.name} is not initialized`)
    }
    return this._filterTools(this._toolDefinitions)
  }

  protected _filterTools(tools: ToolDefinition[]): ToolDefinition[] {
    return tools
  }

  abstract callTool(
    toolName: string,
    input: Record<string, unknown>,
  ): Promise<Array<TextPart | ImageInlinePart | FileInlinePart>>
}
