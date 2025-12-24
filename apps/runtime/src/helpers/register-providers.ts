import { AnthropicProviderAdapter } from "@perstack/anthropic-provider"
import { AzureOpenAIProviderAdapter } from "@perstack/azure-openai-provider"
import { BedrockProviderAdapter } from "@perstack/bedrock-provider"
import type { ProviderConfig } from "@perstack/core"
import { DeepseekProviderAdapter } from "@perstack/deepseek-provider"
import { GoogleProviderAdapter } from "@perstack/google-provider"
import { OllamaProviderAdapter } from "@perstack/ollama-provider"
import { OpenAIProviderAdapter } from "@perstack/openai-provider"
import type { ProviderAdapter, ProviderAdapterOptions } from "@perstack/provider-core"
import { VertexProviderAdapter } from "@perstack/vertex-provider"
import { registerProviderAdapter } from "./provider-adapter-factory.js"

type GenericAdapterConstructor = new (
  config: ProviderConfig,
  options?: ProviderAdapterOptions,
) => ProviderAdapter

registerProviderAdapter(
  "anthropic",
  async () => AnthropicProviderAdapter as unknown as GenericAdapterConstructor,
)

registerProviderAdapter(
  "openai",
  async () => OpenAIProviderAdapter as unknown as GenericAdapterConstructor,
)

registerProviderAdapter(
  "google",
  async () => GoogleProviderAdapter as unknown as GenericAdapterConstructor,
)

registerProviderAdapter(
  "ollama",
  async () => OllamaProviderAdapter as unknown as GenericAdapterConstructor,
)

registerProviderAdapter(
  "azure-openai",
  async () => AzureOpenAIProviderAdapter as unknown as GenericAdapterConstructor,
)

registerProviderAdapter(
  "amazon-bedrock",
  async () => BedrockProviderAdapter as unknown as GenericAdapterConstructor,
)

registerProviderAdapter(
  "google-vertex",
  async () => VertexProviderAdapter as unknown as GenericAdapterConstructor,
)

registerProviderAdapter(
  "deepseek",
  async () => DeepseekProviderAdapter as unknown as GenericAdapterConstructor,
)
