import { createAnthropic } from "@ai-sdk/anthropic"
import type { AnthropicProviderConfig } from "@perstack/core"
import {
  BaseProviderAdapter,
  type ProviderAdapterOptions,
  type ProviderError,
  type ProviderOptions,
  type ProviderOptionsConfig,
  type ProviderToolOptions,
  type ReasoningBudget,
} from "@perstack/provider-core"
import type { LanguageModel, ToolSet } from "ai"
import { isAnthropicRetryable, normalizeAnthropicError } from "./errors.js"
import { buildProviderOptions } from "./skills.js"
import { buildAnthropicTools } from "./tools.js"

export class AnthropicProviderAdapter extends BaseProviderAdapter {
  readonly providerName = "anthropic" as const
  private readonly client: ReturnType<typeof createAnthropic>

  constructor(
    readonly config: AnthropicProviderConfig,
    options?: ProviderAdapterOptions,
  ) {
    super(options)
    this.client = createAnthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      headers: config.headers,
      fetch: options?.proxyUrl ? this.createProxyFetch(options.proxyUrl) : undefined,
    })
  }

  override createModel(modelId: string): LanguageModel {
    return this.client(modelId)
  }

  override getProviderTools(toolNames: string[], options?: ProviderToolOptions): ToolSet {
    return buildAnthropicTools(this.client, toolNames, options)
  }

  override getProviderOptions(config?: ProviderOptionsConfig): ProviderOptions | undefined {
    return buildProviderOptions(config?.skills)
  }

  override getReasoningOptions(budget: ReasoningBudget): ProviderOptions | undefined {
    const budgetTokens = this.budgetToTokens(budget)
    return {
      anthropic: {
        thinking: { type: "enabled", budgetTokens },
      },
    }
  }

  private budgetToTokens(budget: ReasoningBudget): number {
    if (typeof budget === "number") return budget
    const map: Record<string, number> = {
      minimal: 1024,
      low: 2048,
      medium: 5000,
      high: 10000,
    }
    return map[budget] ?? 5000
  }

  override normalizeError(error: unknown): ProviderError {
    return normalizeAnthropicError(error)
  }

  override isRetryable(error: unknown): boolean {
    return isAnthropicRetryable(error)
  }
}
