import type { createVertex } from "@ai-sdk/google-vertex"
import type { ProviderToolOptions } from "@perstack/provider-core"
import type { ToolSet } from "ai"

type VertexClient = ReturnType<typeof createVertex>

export function buildVertexTools(
  client: VertexClient,
  toolNames: string[],
  options?: ProviderToolOptions,
): ToolSet {
  const tools: ToolSet = {}
  for (const name of toolNames) {
    switch (name) {
      case "googleSearch": {
        const googleSearchTool = client.tools.googleSearch({})
        tools["google_search"] = googleSearchTool
        break
      }
      case "codeExecution": {
        const codeExecutionTool = client.tools.codeExecution({})
        tools["code_execution"] = codeExecutionTool
        break
      }
      case "urlContext": {
        const urlContextTool = client.tools.urlContext({})
        tools["url_context"] = urlContextTool
        break
      }
      case "enterpriseWebSearch": {
        const enterpriseWebSearchTool = client.tools.enterpriseWebSearch({})
        tools["enterprise_web_search"] = enterpriseWebSearchTool
        break
      }
      case "googleMaps": {
        const googleMapsTool = client.tools.googleMaps(options?.googleMaps?.retrievalConfig ?? {})
        tools["google_maps"] = googleMapsTool
        break
      }
    }
  }
  return tools
}
