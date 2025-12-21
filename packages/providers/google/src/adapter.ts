import { createGoogleGenerativeAI } from "@ai-sdk/google"
import type { GoogleGenerativeAiProviderConfig } from "@perstack/core"
import {
  BaseProviderAdapter,
  type ProviderAdapterOptions,
  type ProviderError,
  type ProviderOptions,
  type ProviderToolOptions,
  type ReasoningBudget,
} from "@perstack/provider-core"
import type { LanguageModel, ToolSet } from "ai"
import { isGoogleRetryable, normalizeGoogleError } from "./errors.js"
import { buildGoogleTools } from "./tools.js"

export class GoogleProviderAdapter extends BaseProviderAdapter {
  readonly providerName = "google" as const
  private readonly client: ReturnType<typeof createGoogleGenerativeAI>

  constructor(
    readonly config: GoogleGenerativeAiProviderConfig,
    options?: ProviderAdapterOptions,
  ) {
    super(options)
    this.client = createGoogleGenerativeAI({
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
    return buildGoogleTools(this.client, toolNames, options)
  }

  override normalizeError(error: unknown): ProviderError {
    return normalizeGoogleError(error)
  }

  override isRetryable(error: unknown): boolean {
    return isGoogleRetryable(error)
  }

  override getReasoningOptions(budget: ReasoningBudget): ProviderOptions | undefined {
    const budgetTokens = this.budgetToTokens(budget)
    return {
      google: {
        thinkingConfig: {
          thinkingBudget: budgetTokens,
          includeThoughts: true,
        },
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
}
