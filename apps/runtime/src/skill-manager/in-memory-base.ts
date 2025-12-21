import { Client as McpClient } from "@modelcontextprotocol/sdk/client/index.js"
import { type CallToolResult, McpError } from "@modelcontextprotocol/sdk/types.js"
import { BASE_SKILL_NAME, BASE_SKILL_VERSION, createBaseServer } from "@perstack/base"
import {
  createRuntimeEvent,
  type FileInlinePart,
  type ImageInlinePart,
  type RunEvent,
  type RuntimeEvent,
  type SkillType,
  type TextPart,
} from "@perstack/core"
import { BaseSkillManager } from "./base.js"
import { convertToolResult, handleToolError } from "./mcp-converters.js"
import { defaultTransportFactory, type TransportFactory } from "./transport-factory.js"

export interface InMemoryBaseSkillManagerOptions {
  transportFactory?: TransportFactory
}

/**
 * Skill manager for bundled @perstack/base using InMemoryTransport.
 * Runs the base skill in-process for near-zero initialization latency.
 */
export class InMemoryBaseSkillManager extends BaseSkillManager {
  readonly name = BASE_SKILL_NAME
  readonly type: SkillType = "mcp"
  readonly lazyInit = false
  private _mcpClient?: McpClient
  private _transportFactory: TransportFactory

  constructor(
    jobId: string,
    runId: string,
    eventListener?: (event: RunEvent | RuntimeEvent) => void,
    options?: InMemoryBaseSkillManagerOptions,
  ) {
    super(jobId, runId, eventListener)
    this._transportFactory = options?.transportFactory ?? defaultTransportFactory
  }

  protected override async _doInit(): Promise<void> {
    const startTime = Date.now()

    // Create linked transport pair
    const [clientTransport, serverTransport] = this._transportFactory.createInMemoryPair()

    // Create and connect the base server
    const server = createBaseServer()
    await server.connect(serverTransport)

    // Create and connect the client
    this._mcpClient = new McpClient({
      name: `${BASE_SKILL_NAME}-in-memory-client`,
      version: "1.0.0",
    })

    const handshakeStartTime = Date.now()
    await this._mcpClient.connect(clientTransport)
    const handshakeDurationMs = Date.now() - handshakeStartTime

    // Discover tools
    const toolDiscoveryStartTime = Date.now()
    const { tools } = await this._mcpClient.listTools()
    const toolDiscoveryDurationMs = Date.now() - toolDiscoveryStartTime

    this._toolDefinitions = tools.map((tool) => ({
      skillName: BASE_SKILL_NAME,
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      interactive: false,
    }))

    // Emit connected event
    if (this._eventListener) {
      const totalDurationMs = Date.now() - startTime
      const event = createRuntimeEvent("skillConnected", this._jobId, this._runId, {
        skillName: BASE_SKILL_NAME,
        serverInfo: { name: BASE_SKILL_NAME, version: BASE_SKILL_VERSION },
        spawnDurationMs: 0, // No process spawn for in-memory
        handshakeDurationMs,
        toolDiscoveryDurationMs,
        connectDurationMs: handshakeDurationMs,
        totalDurationMs,
      })
      this._eventListener(event)
    }
  }

  override async close(): Promise<void> {
    if (this._mcpClient) {
      await this._mcpClient.close()
      if (this._eventListener) {
        const event = createRuntimeEvent("skillDisconnected", this._jobId, this._runId, {
          skillName: BASE_SKILL_NAME,
        })
        this._eventListener(event)
      }
    }
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
