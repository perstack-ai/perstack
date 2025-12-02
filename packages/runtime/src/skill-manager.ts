import { Client as McpClient } from "@modelcontextprotocol/sdk/client/index.js"
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { type CallToolResult, McpError } from "@modelcontextprotocol/sdk/types.js"
import { createId } from "@paralleldrive/cuid2"
import type {
  CallToolResultContent,
  DelegateSkillManagerParams,
  Expert,
  FileInlinePart,
  ImageInlinePart,
  InteractiveSkill,
  InteractiveSkillManagerParams,
  McpSkillManagerParams,
  McpSseSkill,
  McpStdioSkill,
  Resource,
  RunEvent,
  RunSetting,
  RuntimeEvent,
  SkillManagerParams,
  SkillType,
  TextPart,
  ToolDefinition,
} from "@perstack/core"
import { createRuntimeEvent } from "@perstack/core"
import { jsonSchema, type ToolSet, tool } from "ai"

export class SkillManager {
  protected _toolDefinitions: ToolDefinition[] = []
  protected _initialized = false
  protected _initializing?: Promise<void>
  readonly name: string
  readonly type: SkillType
  readonly lazyInit: boolean
  readonly skill?: McpStdioSkill | McpSseSkill
  readonly interactiveSkill?: InteractiveSkill
  readonly expert?: Expert
  private _mcpClient?: McpClient
  private _params: SkillManagerParams
  private _env: Record<string, string>
  private _runId: string
  private _eventListener?: (event: RunEvent | RuntimeEvent) => void

  constructor(
    params: SkillManagerParams,
    runId: string,
    eventListener?: (event: RunEvent | RuntimeEvent) => void,
  ) {
    this._params = params
    this._runId = runId
    this._eventListener = eventListener
    this.type = params.type
    switch (params.type) {
      case "mcp":
        this.name = params.skill.name
        this.skill = params.skill
        this._env = params.env
        this.lazyInit =
          this.skill.type === "mcpStdioSkill" &&
          this.skill.lazyInit &&
          this.skill.name !== "@perstack/base"
        break
      case "interactive":
        this.name = params.interactiveSkill.name
        this.interactiveSkill = params.interactiveSkill
        this._env = {}
        this.lazyInit = false
        break
      case "delegate":
        this.name = params.expert.name
        this.expert = params.expert
        this._env = {}
        this.lazyInit = false
        break
    }
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

  private async _performInit(): Promise<void> {
    switch (this._params.type) {
      case "mcp": {
        await this._initMcpSkill(this._params)
        break
      }
      case "interactive": {
        await this._initInteractiveSkill(this._params)
        break
      }
      case "delegate": {
        await this._initDelegate(this._params)
        break
      }
    }
    this._initialized = true
    this._initializing = undefined
  }

  private async _initMcpSkill(params: McpSkillManagerParams): Promise<void> {
    if (this.isInitialized()) {
      throw new Error(`Skill ${params.skill.name} is already initialized`)
    }
    this._mcpClient = new McpClient({
      name: `${params.skill.name}-mcp-client`,
      version: "1.0.0",
    })
    switch (params.skill.type) {
      case "mcpStdioSkill": {
        if (!params.skill.command) {
          throw new Error(`Skill ${params.skill.name} has no command`)
        }
        const env: Record<string, string> = {}
        const { requiredEnv } = params.skill
        for (const envName of requiredEnv) {
          if (!this._env[envName]) {
            throw new Error(`Skill ${params.skill.name} requires environment variable ${envName}`)
          }
          env[envName] = this._env[envName]
        }
        const { command, args } = this._getCommandArgs(params.skill)
        const transport = new StdioClientTransport({ command, args, env, stderr: "ignore" })
        await this._mcpClient.connect(transport)
        if (this._eventListener) {
          const serverInfo = this._mcpClient.getServerVersion()
          const event = createRuntimeEvent("skillConnected", this._runId, {
            skillName: params.skill.name,
            serverInfo: serverInfo
              ? { name: serverInfo.name, version: serverInfo.version }
              : undefined,
          })
          this._eventListener(event)
        }
        break
      }
      case "mcpSseSkill": {
        if (!params.skill.endpoint) {
          throw new Error(`Skill ${params.skill.name} has no endpoint`)
        }
        const transport = new SSEClientTransport(new URL(params.skill.endpoint))
        await this._mcpClient.connect(transport)
        break
      }
    }
    const { tools } = await this._mcpClient.listTools()
    this._toolDefinitions = tools.map((tool) => ({
      skillName: params.skill.name,
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      interactive: false,
    }))
  }

  private _getCommandArgs(skill: McpStdioSkill): { command: string; args: string[] } {
    const { name, command, packageName, args } = skill
    if (!packageName && (!args || args.length === 0)) {
      throw new Error(`Skill ${name} has no packageName or args. Please provide one of them.`)
    }
    if (packageName && args && args.length > 0) {
      throw new Error(
        `Skill ${name} has both packageName and args. Please provide only one of them.`,
      )
    }
    let newArgs = args && args.length > 0 ? args : [packageName!]
    if (command === "npx" && !newArgs.includes("-y")) {
      newArgs = ["-y", ...newArgs]
    }
    return { command, args: newArgs }
  }

  private async _initInteractiveSkill(params: InteractiveSkillManagerParams): Promise<void> {
    if (this.isInitialized()) {
      throw new Error(`Skill ${params.interactiveSkill.name} is already initialized`)
    }
    this._toolDefinitions = Object.values(params.interactiveSkill.tools).map((tool) => ({
      skillName: params.interactiveSkill.name,
      name: tool.name,
      description: tool.description,
      inputSchema: JSON.parse(tool.inputJsonSchema),
      interactive: true,
    }))
  }

  private async _initDelegate(params: DelegateSkillManagerParams): Promise<void> {
    if (this.isInitialized()) {
      throw new Error(`Skill ${params.expert.name} is already initialized`)
    }
    this._toolDefinitions = [
      {
        skillName: params.expert.name,
        name: params.expert.name.split("/").pop() ?? params.expert.name,
        description: params.expert.description,
        inputSchema: {
          type: "object",
          properties: { query: { type: "string" } },
          required: ["query"],
        },
        interactive: false,
      },
    ]
  }

  async close(): Promise<void> {
    if (this._mcpClient) {
      await this._mcpClient.close()
      if (this._eventListener && this.skill) {
        const event = createRuntimeEvent("skillDisconnected", this._runId, {
          skillName: this.skill.name,
        })
        this._eventListener(event)
      }
    }
  }

  async getToolDefinitions(): Promise<ToolDefinition[]> {
    if (!this.isInitialized() && !this.lazyInit) {
      throw new Error(`Skill ${this.name} is not initialized`)
    }
    if (!this.isInitialized() && this.lazyInit) {
      return []
    }
    if (this._params.type === "mcp") {
      const omit = this._params.skill.omit ?? []
      const pick = this._params.skill.pick ?? []
      return this._toolDefinitions
        .filter((tool) => (omit.length > 0 ? !omit.includes(tool.name) : true))
        .filter((tool) => (pick.length > 0 ? pick.includes(tool.name) : true))
    }
    return this._toolDefinitions
  }

  async callTool(
    toolName: string,
    input: Record<string, unknown>,
  ): Promise<Array<TextPart | ImageInlinePart | FileInlinePart>> {
    switch (this._params.type) {
      case "mcp": {
        if (!this.isInitialized() || !this._mcpClient) {
          throw new Error(`${this.name} is not initialized`)
        }
        try {
          const result = (await this._mcpClient.callTool({
            name: toolName,
            arguments: input,
          })) as CallToolResult
          return this._convertToolResult(result, toolName, input)
        } catch (error) {
          return this._handleToolError(error, toolName)
        }
      }
      case "interactive": {
        return []
      }
      case "delegate": {
        return []
      }
    }
  }

  private _handleToolError(error: unknown, toolName: string): Array<TextPart> {
    if (error instanceof McpError) {
      return [
        {
          type: "textPart",
          text: `Error calling tool ${toolName}: ${error.message}`,
          id: createId(),
        },
      ]
    }
    // if (error instanceof ZodError) {
    //   return [{ type: "textPart", text: `Invalid tool call arguments: ${error}`, id: createId() }]
    // }
    throw error
  }

  private _convertToolResult(
    result: CallToolResult,
    toolName: string,
    input: Record<string, unknown>,
  ): Array<TextPart | ImageInlinePart | FileInlinePart> {
    if (!result.content || result.content.length === 0) {
      return [
        {
          type: "textPart",
          text: `Tool ${toolName} returned nothing with arguments: ${JSON.stringify(input)}`,
          id: createId(),
        },
      ]
    }
    return result.content
      .filter((part) => part.type !== "audio" && part.type !== "resource_link")
      .map((part) => this._convertPart(part as CallToolResultContent))
  }

  private _convertPart(part: CallToolResultContent): TextPart | ImageInlinePart | FileInlinePart {
    switch (part.type) {
      case "text":
        if (!part.text || part.text === "") {
          return { type: "textPart", text: "Error: No content", id: createId() }
        }
        return { type: "textPart", text: part.text, id: createId() }
      case "image":
        if (!part.data || !part.mimeType) {
          throw new Error("Image part must have both data and mimeType")
        }
        return {
          type: "imageInlinePart",
          encodedData: part.data,
          mimeType: part.mimeType,
          id: createId(),
        }
      case "resource":
        if (!part.resource) {
          throw new Error("Resource part must have resource content")
        }
        return this._convertResource(part.resource)
    }
  }

  private _convertResource(resource: Resource): TextPart | FileInlinePart {
    if (!resource.mimeType) {
      throw new Error(`Resource ${JSON.stringify(resource)} has no mimeType`)
    }
    if (resource.text && typeof resource.text === "string") {
      return { type: "textPart", text: resource.text, id: createId() }
    }
    if (resource.blob && typeof resource.blob === "string") {
      return {
        type: "fileInlinePart",
        encodedData: resource.blob,
        mimeType: resource.mimeType,
        id: createId(),
      }
    }
    throw new Error(`Unsupported resource type: ${JSON.stringify(resource)}`)
  }
}

async function initSkillManagersWithCleanup(
  managers: SkillManager[],
  allManagers: SkillManager[],
): Promise<void> {
  const results = await Promise.allSettled(managers.map((m) => m.init()))
  const firstRejected = results.find((r) => r.status === "rejected")
  if (firstRejected) {
    await Promise.all(allManagers.map((m) => m.close().catch(() => {})))
    throw (firstRejected as PromiseRejectedResult).reason
  }
}

export async function getSkillManagers(
  expert: Expert,
  experts: Record<string, Expert>,
  setting: RunSetting,
  eventListener?: (event: RunEvent | RuntimeEvent) => void,
): Promise<Record<string, SkillManager>> {
  const { perstackBaseSkillCommand, env, runId } = setting
  const { skills } = expert
  if (!skills["@perstack/base"]) {
    throw new Error("Base skill is not defined")
  }
  const allManagers: SkillManager[] = []
  const mcpSkills = Object.values(skills).filter(
    (skill) => skill.type === "mcpStdioSkill" || skill.type === "mcpSseSkill",
  )
  for (const skill of mcpSkills) {
    if (perstackBaseSkillCommand && skill.type === "mcpStdioSkill") {
      const matchesBaseByPackage = skill.command === "npx" && skill.packageName === "@perstack/base"
      const matchesBaseByArgs =
        skill.command === "npx" &&
        Array.isArray(skill.args) &&
        skill.args.includes("@perstack/base")
      if (matchesBaseByPackage || matchesBaseByArgs) {
        const [overrideCommand, ...overrideArgs] = perstackBaseSkillCommand
        if (!overrideCommand) {
          throw new Error("perstackBaseSkillCommand must have at least one element")
        }
        skill.command = overrideCommand
        skill.packageName = undefined
        skill.args = overrideArgs
        skill.lazyInit = false
      }
    }
  }
  const mcpSkillManagers = mcpSkills.map((skill) => {
    const manager = new SkillManager({ type: "mcp", skill, env }, runId, eventListener)
    allManagers.push(manager)
    return manager
  })
  await initSkillManagersWithCleanup(mcpSkillManagers, allManagers)
  const interactiveSkills = Object.values(skills).filter(
    (skill) => skill.type === "interactiveSkill",
  )
  const interactiveSkillManagers = interactiveSkills.map((interactiveSkill) => {
    const manager = new SkillManager(
      { type: "interactive", interactiveSkill },
      runId,
      eventListener,
    )
    allManagers.push(manager)
    return manager
  })
  await initSkillManagersWithCleanup(interactiveSkillManagers, allManagers)
  const delegateSkillManagers = expert.delegates.map((delegateExpertName) => {
    const delegate = experts[delegateExpertName]
    const manager = new SkillManager({ type: "delegate", expert: delegate }, runId, eventListener)
    allManagers.push(manager)
    return manager
  })
  await initSkillManagersWithCleanup(delegateSkillManagers, allManagers)
  const skillManagers: Record<string, SkillManager> = {}
  for (const manager of allManagers) {
    skillManagers[manager.name] = manager
  }
  return skillManagers
}

export async function closeSkillManagers(
  skillManagers: Record<string, SkillManager>,
): Promise<void> {
  for (const skillManager of Object.values(skillManagers)) {
    await skillManager.close()
  }
}

export async function getSkillManagerByToolName(
  skillManagers: Record<string, SkillManager>,
  toolName: string,
): Promise<SkillManager> {
  for (const skillManager of Object.values(skillManagers)) {
    const toolDefinitions = await skillManager.getToolDefinitions()
    for (const toolDefinition of toolDefinitions) {
      if (toolDefinition.name === toolName) {
        return skillManager
      }
    }
  }
  throw new Error(`Tool ${toolName} not found`)
}

export async function getToolSet(skillManagers: Record<string, SkillManager>): Promise<ToolSet> {
  const tools: ToolSet = {}
  for (const skillManager of Object.values(skillManagers)) {
    const toolDefinitions = await skillManager.getToolDefinitions()
    for (const toolDefinition of toolDefinitions) {
      tools[toolDefinition.name] = tool({
        description: toolDefinition.description,
        inputSchema: jsonSchema(toolDefinition.inputSchema),
      })
    }
  }
  return tools
}
