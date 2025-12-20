import type { createOpenAI } from "@ai-sdk/openai"
import type { ProviderToolOptions } from "@perstack/provider-core"
import type { ToolSet } from "ai"

type OpenAIClient = ReturnType<typeof createOpenAI>

export function buildOpenAITools(
  client: OpenAIClient,
  toolNames: string[],
  options?: ProviderToolOptions,
): ToolSet {
  const tools: ToolSet = {}
  for (const name of toolNames) {
    switch (name) {
      case "webSearch": {
        const webSearchTool = client.tools.webSearch()
        tools.web_search = webSearchTool
        break
      }
      case "fileSearch": {
        const vectorStoreIds = options?.fileSearch?.vectorStoreIds
        if (vectorStoreIds && vectorStoreIds.length > 0) {
          const fileSearchTool = client.tools.fileSearch({
            vectorStoreIds,
            maxNumResults: options?.fileSearch?.maxNumResults,
          })
          tools.file_search = fileSearchTool
        }
        break
      }
      case "codeInterpreter": {
        const codeInterpreterTool = client.tools.codeInterpreter()
        tools.code_interpreter = codeInterpreterTool
        break
      }
      case "imageGeneration": {
        const imageGenerationTool = client.tools.imageGeneration()
        tools.image_generation = imageGenerationTool
        break
      }
    }
  }
  return tools
}
