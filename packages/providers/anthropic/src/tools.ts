import type { createAnthropic } from "@ai-sdk/anthropic"
import type { ProviderToolOptions } from "@perstack/provider-core"
import type { ToolSet } from "ai"

type AnthropicClient = ReturnType<typeof createAnthropic>

export function buildAnthropicTools(
  client: AnthropicClient,
  toolNames: string[],
  options?: ProviderToolOptions,
): ToolSet {
  const tools: ToolSet = {}
  for (const name of toolNames) {
    switch (name) {
      case "webSearch": {
        const webSearchTool = client.tools.webSearch_20250305({
          maxUses: options?.webSearch?.maxUses,
          allowedDomains: options?.webSearch?.allowedDomains,
        })
        tools["web_search"] = webSearchTool
        break
      }
      case "webFetch": {
        const webFetchTool = client.tools.webFetch_20250910({
          maxUses: options?.webFetch?.maxUses,
        })
        tools["web_fetch"] = webFetchTool
        break
      }
      case "codeExecution": {
        const codeExecutionTool = client.tools.codeExecution_20250522()
        tools["code_execution"] = codeExecutionTool
        break
      }
    }
  }
  return tools
}
