import { Client as McpClient } from "@modelcontextprotocol/sdk/client/index.js"
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { type CallToolResult, McpError } from "@modelcontextprotocol/sdk/types.js"
import { createId } from "@paralleldrive/cuid2"
import {
  type CallToolResultContent,
  createRuntimeEvent,
  type FileInlinePart,
  getFilteredEnv,
  type ImageInlinePart,
  type McpSseSkill,
  type McpStdioSkill,
  type Resource,
  type RunEvent,
  type RuntimeEvent,
  type SkillType,
  type TextPart,
  type ToolDefinition,
} from "@perstack/core"
import { BaseSkillManager } from "./base.js"

export class McpSkillManager extends BaseSkillManager {
  readonly name: string
  readonly type: SkillType = "mcp"
  readonly lazyInit: boolean
  override readonly skill: McpStdioSkill | McpSseSkill
  private _mcpClient?: McpClient
  private _env: Record<string, string>

  constructor(
    skill: McpStdioSkill | McpSseSkill,
    env: Record<string, string>,
    jobId: string,
    runId: string,
    eventListener?: (event: RunEvent | RuntimeEvent) => void,
  ) {
    super(jobId, runId, eventListener)
    this.name = skill.name
    this.skill = skill
    this._env = env
    this.lazyInit =
      skill.type === "mcpStdioSkill" && skill.lazyInit && skill.name !== "@perstack/base"
  }

  protected override async _doInit(): Promise<void> {
    this._mcpClient = new McpClient({
      name: `${this.skill.name}-mcp-client`,
      version: "1.0.0",
    })
    if (this.skill.type === "mcpStdioSkill") {
      await this._initStdio(this.skill)
    } else {
      await this._initSse(this.skill)
    }
    const { tools } = await this._mcpClient.listTools()
    this._toolDefinitions = tools.map((tool) => ({
      skillName: this.skill.name,
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      interactive: false,
    }))
  }

  private async _initStdio(skill: McpStdioSkill): Promise<void> {
    if (!skill.command) {
      throw new Error(`Skill ${skill.name} has no command`)
    }
    const requiredEnv: Record<string, string> = {}
    for (const envName of skill.requiredEnv) {
      if (!this._env[envName]) {
        throw new Error(`Skill ${skill.name} requires environment variable ${envName}`)
      }
      requiredEnv[envName] = this._env[envName]
    }
    const env = getFilteredEnv(requiredEnv)
    const startTime = Date.now()
    const { command, args } = this._getCommandArgs(skill)
    if (this._eventListener) {
      const event = createRuntimeEvent("skillStarting", this._jobId, this._runId, {
        skillName: skill.name,
        command,
        args,
      })
      this._eventListener(event)
    }
    const transport = new StdioClientTransport({ command, args, env, stderr: "pipe" })
    if (transport.stderr) {
      transport.stderr.on("data", (chunk: Buffer) => {
        if (this._eventListener) {
          const event = createRuntimeEvent("skillStderr", this._jobId, this._runId, {
            skillName: skill.name,
            message: chunk.toString().trim(),
          })
          this._eventListener(event)
        }
      })
    }
    const connectStartTime = Date.now()
    await this._mcpClient!.connect(transport)
    const connectTime = Date.now()
    if (this._eventListener) {
      const serverInfo = this._mcpClient!.getServerVersion()
      const event = createRuntimeEvent("skillConnected", this._jobId, this._runId, {
        skillName: skill.name,
        serverInfo: serverInfo ? { name: serverInfo.name, version: serverInfo.version } : undefined,
        connectDurationMs: connectTime - connectStartTime,
        totalDurationMs: connectTime - startTime,
      })
      this._eventListener(event)
    }
  }

  private async _initSse(skill: McpSseSkill): Promise<void> {
    if (!skill.endpoint) {
      throw new Error(`Skill ${skill.name} has no endpoint`)
    }
    const url = new URL(skill.endpoint)
    if (url.protocol !== "https:") {
      throw new Error(`Skill ${skill.name} SSE endpoint must use HTTPS: ${skill.endpoint}`)
    }
    if (this._isPrivateOrLocalIP(url.hostname)) {
      throw new Error(
        `Skill ${skill.name} SSE endpoint cannot use private/local IP: ${skill.endpoint}`,
      )
    }
    const transport = new SSEClientTransport(url)
    await this._mcpClient!.connect(transport)
  }

  private _isPrivateOrLocalIP(hostname: string): boolean {
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
    if (hostname.startsWith("fe80:") || hostname.startsWith("fc00:") || hostname.startsWith("fd")) {
      if (hostname.includes(":")) {
        return true
      }
    }
    return false
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

  override async close(): Promise<void> {
    if (this._mcpClient) {
      await this._mcpClient.close()
      if (this._eventListener && this.skill) {
        const event = createRuntimeEvent("skillDisconnected", this._jobId, this._runId, {
          skillName: this.skill.name,
        })
        this._eventListener(event)
      }
    }
  }

  protected override _filterTools(tools: ToolDefinition[]): ToolDefinition[] {
    const omit = this.skill.omit ?? []
    const pick = this.skill.pick ?? []
    return tools
      .filter((tool) => (omit.length > 0 ? !omit.includes(tool.name) : true))
      .filter((tool) => (pick.length > 0 ? pick.includes(tool.name) : true))
  }

  override async callTool(
    toolName: string,
    input: Record<string, unknown>,
  ): Promise<Array<TextPart | ImageInlinePart | FileInlinePart>> {
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
