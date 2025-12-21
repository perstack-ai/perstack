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
    const level = this.budgetToThinkingLevel(budget)
    return {
      google: {
        thinkingConfig: {
          thinkingLevel: level,
          includeThoughts: true,
        },
      },
    }
  }

  private budgetToThinkingLevel(budget: ReasoningBudget): string {
    if (typeof budget === "number") {
      if (budget <= 1024) return "MINIMAL"
      if (budget <= 2048) return "LOW"
      if (budget <= 5000) return "MEDIUM"
      return "HIGH"
    }
    const map: Record<string, string> = {
      minimal: "MINIMAL",
      low: "LOW",
      medium: "MEDIUM",
      high: "HIGH",
    }
    return map[budget] ?? "MEDIUM"
  }
}
