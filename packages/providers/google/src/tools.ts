import type { createGoogleGenerativeAI } from "@ai-sdk/google"
import type { ProviderToolOptions } from "@perstack/provider-core"
import type { ToolSet } from "ai"

type GoogleClient = ReturnType<typeof createGoogleGenerativeAI>

export function buildGoogleTools(
  client: GoogleClient,
  toolNames: string[],
  _options?: ProviderToolOptions,
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
    }
  }
  return tools
}
