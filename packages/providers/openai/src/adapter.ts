import { createOpenAI } from "@ai-sdk/openai"
import type { OpenAiProviderConfig } from "@perstack/core"
import {
  BaseProviderAdapter,
  type ProviderAdapterOptions,
  type ProviderError,
  type ProviderOptions,
  type ProviderToolOptions,
  type ReasoningBudget,
} from "@perstack/provider-core"
import type { LanguageModel, ToolSet } from "ai"
import { isOpenAIRetryable, normalizeOpenAIError } from "./errors.js"
import { buildOpenAITools } from "./tools.js"

export class OpenAIProviderAdapter extends BaseProviderAdapter {
  readonly providerName = "openai" as const
  private readonly client: ReturnType<typeof createOpenAI>

  constructor(
    readonly config: OpenAiProviderConfig,
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

  override getReasoningOptions(budget: ReasoningBudget): ProviderOptions | undefined {
    const effort = this.budgetToEffort(budget)
    return {
      openai: { reasoningEffort: effort },
    }
  }

  private budgetToEffort(budget: ReasoningBudget): string {
    if (typeof budget === "number") {
      if (budget <= 1024) return "minimal"
      if (budget <= 2048) return "low"
      if (budget <= 5000) return "medium"
      return "high"
    }
    return budget
  }

  override normalizeError(error: unknown): ProviderError {
    return normalizeOpenAIError(error)
  }

  override isRetryable(error: unknown): boolean {
    return isOpenAIRetryable(error)
  }
}
