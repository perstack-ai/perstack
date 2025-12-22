import type { ProviderConfig } from "@perstack/core"
import type { ProviderAdapter, ProviderAdapterOptions } from "@perstack/provider-core"
import { registerProviderAdapter } from "./provider-adapter-factory.js"

type GenericAdapterConstructor = new (
  config: ProviderConfig,
  options?: ProviderAdapterOptions,
) => ProviderAdapter

registerProviderAdapter("anthropic", async () => {
  const { AnthropicProviderAdapter } = await import("@perstack/anthropic-provider")
  return AnthropicProviderAdapter as unknown as GenericAdapterConstructor
})

registerProviderAdapter("openai", async () => {
  const { OpenAIProviderAdapter } = await import("@perstack/openai-provider")
  return OpenAIProviderAdapter as unknown as GenericAdapterConstructor
})

registerProviderAdapter("google", async () => {
  const { GoogleProviderAdapter } = await import("@perstack/google-provider")
  return GoogleProviderAdapter as unknown as GenericAdapterConstructor
})

registerProviderAdapter("ollama", async () => {
  const { OllamaProviderAdapter } = await import("@perstack/ollama-provider")
  return OllamaProviderAdapter as unknown as GenericAdapterConstructor
})

registerProviderAdapter("azure-openai", async () => {
  const { AzureOpenAIProviderAdapter } = await import("@perstack/azure-openai-provider")
  return AzureOpenAIProviderAdapter as unknown as GenericAdapterConstructor
})

registerProviderAdapter("amazon-bedrock", async () => {
  const { BedrockProviderAdapter } = await import("@perstack/bedrock-provider")
  return BedrockProviderAdapter as unknown as GenericAdapterConstructor
})

registerProviderAdapter("google-vertex", async () => {
  const { VertexProviderAdapter } = await import("@perstack/vertex-provider")
  return VertexProviderAdapter as unknown as GenericAdapterConstructor
})

registerProviderAdapter("deepseek", async () => {
  const { DeepseekProviderAdapter } = await import("@perstack/deepseek-provider")
  return DeepseekProviderAdapter as unknown as GenericAdapterConstructor
})
