import { Client as McpClient } from "@modelcontextprotocol/sdk/client/index.js"
import type { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { type CallToolResult, McpError } from "@modelcontextprotocol/sdk/types.js"
import {
  createRuntimeEvent,
  type FileInlinePart,
  getFilteredEnv,
  type ImageInlinePart,
  type McpSseSkill,
  type McpStdioSkill,
  type RunEvent,
  type RuntimeEvent,
  type SkillType,
  type TextPart,
  type ToolDefinition,
} from "@perstack/core"
import { BaseSkillManager } from "./base.js"
import { getCommandArgs } from "./command-args.js"
import { isPrivateOrLocalIP } from "./ip-validator.js"
import { convertToolResult, handleToolError } from "./mcp-converters.js"
import { defaultTransportFactory, type TransportFactory } from "./transport-factory.js"

interface InitTimingInfo {
  startTime: number
  spawnDurationMs: number
  handshakeDurationMs: number
  serverInfo?: { name: string; version: string }
}

export interface McpSkillManagerOptions {
  transportFactory?: TransportFactory
}

export class McpSkillManager extends BaseSkillManager {
  readonly name: string
  readonly type: SkillType = "mcp"
  readonly lazyInit: boolean
  override readonly skill: McpStdioSkill | McpSseSkill
  private _mcpClient?: McpClient
  private _env: Record<string, string>
  private _transportFactory: TransportFactory

  constructor(
    skill: McpStdioSkill | McpSseSkill,
    env: Record<string, string>,
    jobId: string,
    runId: string,
    eventListener?: (event: RunEvent | RuntimeEvent) => void,
    options?: McpSkillManagerOptions,
  ) {
    super(jobId, runId, eventListener)
    this.name = skill.name
    this.skill = skill
    this._env = env
    this._transportFactory = options?.transportFactory ?? defaultTransportFactory
    this.lazyInit =
      skill.type === "mcpStdioSkill" && skill.lazyInit && skill.name !== "@perstack/base"
  }

  protected override async _doInit(): Promise<void> {
    this._mcpClient = new McpClient({
      name: `${this.skill.name}-mcp-client`,
      version: "1.0.0",
    })
    let timingInfo: InitTimingInfo | undefined
    if (this.skill.type === "mcpStdioSkill") {
      timingInfo = await this._initStdio(this.skill)
    } else {
      await this._initSse(this.skill)
    }
    const toolDiscoveryStartTime = Date.now()
    const { tools } = await this._mcpClient.listTools()
    const toolDiscoveryDurationMs = Date.now() - toolDiscoveryStartTime
    this._toolDefinitions = tools.map((tool) => ({
      skillName: this.skill.name,
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      interactive: false,
    }))
    if (this._eventListener && timingInfo) {
      const totalDurationMs = Date.now() - timingInfo.startTime
      const event = createRuntimeEvent("skillConnected", this._jobId, this._runId, {
        skillName: this.skill.name,
        serverInfo: timingInfo.serverInfo,
        spawnDurationMs: timingInfo.spawnDurationMs,
        handshakeDurationMs: timingInfo.handshakeDurationMs,
        toolDiscoveryDurationMs,
        connectDurationMs: timingInfo.spawnDurationMs + timingInfo.handshakeDurationMs,
        totalDurationMs,
      })
      this._eventListener(event)
    }
  }

  private async _initStdio(skill: McpStdioSkill): Promise<InitTimingInfo> {
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
    const { command, args } = getCommandArgs(skill)
    if (this._eventListener) {
      const event = createRuntimeEvent("skillStarting", this._jobId, this._runId, {
        skillName: skill.name,
        command,
        args,
      })
      this._eventListener(event)
    }
    const transport = this._transportFactory.createStdio({ command, args, env, stderr: "pipe" })
    const spawnDurationMs = Date.now() - startTime
    if ((transport as StdioClientTransport).stderr) {
      ;(transport as StdioClientTransport).stderr!.on("data", (chunk: Buffer) => {
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
    const handshakeDurationMs = Date.now() - connectStartTime
    const serverVersion = this._mcpClient!.getServerVersion()
    return {
      startTime,
      spawnDurationMs,
      handshakeDurationMs,
      serverInfo: serverVersion
        ? { name: serverVersion.name, version: serverVersion.version }
        : undefined,
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
    if (isPrivateOrLocalIP(url.hostname)) {
      throw new Error(
        `Skill ${skill.name} SSE endpoint cannot use private/local IP: ${skill.endpoint}`,
      )
    }
    const transport = this._transportFactory.createSse({ url })
    await this._mcpClient!.connect(transport)
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
      return convertToolResult(result, toolName, input)
    } catch (error) {
      return handleToolError(error, toolName, McpError)
    }
  }
}
