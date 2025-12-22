import type { createAzure } from "@ai-sdk/azure"
import type { ProviderToolOptions } from "@perstack/provider-core"
import type { ToolSet } from "ai"

type AzureClient = ReturnType<typeof createAzure>

export function buildAzureOpenAITools(
  client: AzureClient,
  toolNames: string[],
  options?: ProviderToolOptions,
): ToolSet {
  const tools: ToolSet = {}
  for (const name of toolNames) {
    switch (name) {
      case "webSearchPreview": {
        const webSearchTool = client.tools.webSearchPreview({})
        tools["web_search_preview"] = webSearchTool
        break
      }
      case "fileSearch": {
        const vectorStoreIds = options?.fileSearch?.vectorStoreIds
        if (!vectorStoreIds || vectorStoreIds.length === 0) {
          console.warn(
            "Azure OpenAI fileSearch tool requires vectorStoreIds. " +
              "Set providerToolOptions.fileSearch.vectorStoreIds to use this tool.",
          )
          break
        }
        const fileSearchTool = client.tools.fileSearch({
          vectorStoreIds,
          maxNumResults: options?.fileSearch?.maxNumResults,
        })
        tools["file_search"] = fileSearchTool
        break
      }
      case "codeInterpreter": {
        const codeInterpreterTool = client.tools.codeInterpreter()
        tools["code_interpreter"] = codeInterpreterTool
        break
      }
      case "imageGeneration": {
        const imageGenerationTool = client.tools.imageGeneration()
        tools["image_generation"] = imageGenerationTool
        break
      }
    }
  }
  return tools
}
