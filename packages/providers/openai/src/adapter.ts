import { createOpenAI } from "@ai-sdk/openai"
import type { OpenAiProviderConfig } from "@perstack/core"
import {
  BaseProviderAdapter,
  type ProviderAdapterOptions,
  type ProviderError,
  type ProviderToolOptions,
} from "@perstack/provider-core"
import type { LanguageModel, ToolSet } from "ai"
import { isOpenAIRetryable, normalizeOpenAIError } from "./errors.js"
import { buildOpenAITools } from "./tools.js"

export class OpenAIProviderAdapter extends BaseProviderAdapter {
  readonly providerName = "openai" as const
  private readonly client: ReturnType<typeof createOpenAI>

  constructor(
    private readonly config: OpenAiProviderConfig,
    options?: ProviderAdapterOptions,
  ) {
    super(options)
    this.client = createOpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      organization: config.organization,
      project: config.project,
      name: config.name,
      headers: config.headers,
      fetch: options?.proxyUrl ? this.createProxyFetch(options.proxyUrl) : undefined,
    })
  }

  override createModel(modelId: string): LanguageModel {
    return this.client(modelId)
  }

  override getProviderTools(toolNames: string[], options?: ProviderToolOptions): ToolSet {
    return buildOpenAITools(this.client, toolNames, options)
  }

  override normalizeError(error: unknown): ProviderError {
    return normalizeOpenAIError(error)
  }

  override isRetryable(error: unknown): boolean {
    return isOpenAIRetryable(error)
  }
}
