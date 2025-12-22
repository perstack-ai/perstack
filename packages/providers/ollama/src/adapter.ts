import type { OllamaProviderConfig } from "@perstack/core"
import {
  BaseProviderAdapter,
  type ProviderAdapterOptions,
  type ProviderError,
  type ProviderOptions,
  type ProviderOptionsConfig,
  type ReasoningBudget,
} from "@perstack/provider-core"
import type { LanguageModel } from "ai"
import { createOllama } from "ollama-ai-provider-v2"
import { isOllamaRetryable, normalizeOllamaError } from "./errors.js"

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

  override getProviderOptions(config?: ProviderOptionsConfig): ProviderOptions | undefined {
    if (config?.think === undefined) {
      return undefined
    }
    return {
      ollama: {
        think: config.think,
      },
    }
  }

  override getReasoningOptions(budget: ReasoningBudget): ProviderOptions | undefined {
    // Ollama uses 'think' toggle for hybrid reasoning models
    // Return undefined when reasoning is disabled
    if (budget === "none" || budget === 0) {
      return undefined
    }
    return {
      ollama: {
        think: true,
      },
    }
  }

  override normalizeError(error: unknown): ProviderError {
    return normalizeOllamaError(error)
  }

  override isRetryable(error: unknown): boolean {
    return isOllamaRetryable(error)
  }
}
