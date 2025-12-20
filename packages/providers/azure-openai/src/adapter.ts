import { createAzure } from "@ai-sdk/azure"
import type { AzureOpenAiProviderConfig } from "@perstack/core"
import { BaseProviderAdapter, type ProviderAdapterOptions } from "@perstack/provider-core"
import type { LanguageModel } from "ai"

export class AzureOpenAIProviderAdapter extends BaseProviderAdapter {
  readonly providerName = "azure-openai" as const
  private readonly client: ReturnType<typeof createAzure>

  constructor(
    readonly config: AzureOpenAiProviderConfig,
    options?: ProviderAdapterOptions,
  ) {
    super(options)
    this.client = createAzure({
      apiKey: config.apiKey,
      resourceName: config.resourceName,
      apiVersion: config.apiVersion,
      baseURL: config.baseUrl,
      headers: config.headers,
      useDeploymentBasedUrls: config.useDeploymentBasedUrls,
      fetch: options?.proxyUrl ? this.createProxyFetch(options.proxyUrl) : undefined,
    })
  }

  override createModel(modelId: string): LanguageModel {
    return this.client(modelId)
  }
}
