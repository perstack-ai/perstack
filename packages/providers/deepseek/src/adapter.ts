import { createDeepSeek } from "@ai-sdk/deepseek"
import type { DeepseekProviderConfig } from "@perstack/core"
import {
  BaseProviderAdapter,
  type ProviderAdapterOptions,
  type ProviderError,
} from "@perstack/provider-core"
import type { LanguageModel } from "ai"
import { isDeepSeekRetryable, normalizeDeepSeekError } from "./errors.js"

export class DeepseekProviderAdapter extends BaseProviderAdapter {
  readonly providerName = "deepseek" as const
  private readonly client: ReturnType<typeof createDeepSeek>

  constructor(
    readonly config: DeepseekProviderConfig,
    options?: ProviderAdapterOptions,
  ) {
    super(options)
    this.client = createDeepSeek({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      headers: config.headers,
      fetch: options?.proxyUrl ? this.createProxyFetch(options.proxyUrl) : undefined,
    })
  }

  override createModel(modelId: string): LanguageModel {
    return this.client(modelId)
  }

  override normalizeError(error: unknown): ProviderError {
    return normalizeDeepSeekError(error)
  }

  override isRetryable(error: unknown): boolean {
    return isDeepSeekRetryable(error)
  }
}
