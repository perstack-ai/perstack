import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js"

export interface StdioTransportOptions {
  command: string
  args: string[]
  env: Record<string, string>
  stderr?: "pipe" | "inherit" | "ignore"
}

export interface SseTransportOptions {
  url: URL
}

/**
 * Factory interface for creating MCP transports.
 * Allows for dependency injection and easier testing.
 */
export interface TransportFactory {
  createStdio(options: StdioTransportOptions): StdioClientTransport
  createSse(options: SseTransportOptions): Transport
}

/**
 * Default implementation of TransportFactory using real MCP SDK transports.
 */
export class DefaultTransportFactory implements TransportFactory {
  createStdio(options: StdioTransportOptions): StdioClientTransport {
    return new StdioClientTransport({
      command: options.command,
      args: options.args,
      env: options.env,
      stderr: options.stderr,
    })
  }

  createSse(options: SseTransportOptions): Transport {
    return new SSEClientTransport(options.url)
  }
}

/**
 * Default transport factory instance.
 */
export const defaultTransportFactory = new DefaultTransportFactory()
