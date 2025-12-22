import { createAzure } from "@ai-sdk/azure"
import type { AzureOpenAiProviderConfig } from "@perstack/core"
import {
  BaseProviderAdapter,
  type ProviderAdapterOptions,
  type ProviderError,
  type ProviderToolOptions,
} from "@perstack/provider-core"
import type { LanguageModel, ToolSet } from "ai"
import { isAzureOpenAIRetryable, normalizeAzureOpenAIError } from "./errors.js"
import { buildAzureOpenAITools } from "./tools.js"

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

  override getProviderTools(toolNames: string[], options?: ProviderToolOptions): ToolSet {
    return buildAzureOpenAITools(this.client, toolNames, options)
  }

  override normalizeError(error: unknown): ProviderError {
    return normalizeAzureOpenAIError(error)
  }

  override isRetryable(error: unknown): boolean {
    return isAzureOpenAIRetryable(error)
  }
}
