import type { OllamaProviderConfig } from "@perstack/core"
import { BaseProviderAdapter, type ProviderAdapterOptions } from "@perstack/provider-core"
import type { LanguageModel } from "ai"
import { createOllama } from "ollama-ai-provider-v2"

export class OllamaProviderAdapter extends BaseProviderAdapter {
  readonly providerName = "ollama" as const
  private readonly client: ReturnType<typeof createOllama>

  constructor(
    readonly config: OllamaProviderConfig,
    options?: ProviderAdapterOptions,
  ) {
    super(options)
    this.client = createOllama({
      baseURL: config.baseUrl,
      headers: config.headers,
      fetch: options?.proxyUrl ? this.createProxyFetch(options.proxyUrl) : undefined,
    })
  }

  override createModel(modelId: string): LanguageModel {
    return this.client(modelId)
  }
}
