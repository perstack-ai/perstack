import { createVertex } from "@ai-sdk/google-vertex"
import type { GoogleVertexProviderConfig } from "@perstack/core"
import {
  BaseProviderAdapter,
  type ProviderAdapterOptions,
  type ProviderError,
  type ProviderOptions,
  type ProviderOptionsConfig,
  type ProviderToolOptions,
  type ReasoningBudget,
} from "@perstack/provider-core"
import type { JSONValue, LanguageModel, ToolSet } from "ai"
import { isVertexRetryable, normalizeVertexError } from "./errors.js"
import { buildVertexTools } from "./tools.js"

export class VertexProviderAdapter extends BaseProviderAdapter {
  readonly providerName = "google-vertex" as const
  private readonly client: ReturnType<typeof createVertex>

  constructor(
    readonly config: GoogleVertexProviderConfig,
    options?: ProviderAdapterOptions,
  ) {
    super(options)
    this.client = createVertex({
      project: config.project,
      location: config.location,
      baseURL: config.baseUrl,
      headers: config.headers,
      fetch: options?.proxyUrl ? this.createProxyFetch(options.proxyUrl) : undefined,
    })
  }

  override createModel(modelId: string): LanguageModel {
    return this.client(modelId)
  }

  override getProviderTools(toolNames: string[], options?: ProviderToolOptions): ToolSet {
    return buildVertexTools(this.client, toolNames, options)
  }

  override getProviderOptions(config?: ProviderOptionsConfig): ProviderOptions | undefined {
    if (!config?.safetySettings || config.safetySettings.length === 0) {
      return undefined
    }
    return {
      vertex: {
        safetySettings: config.safetySettings as unknown as JSONValue,
      },
    }
  }

  override getReasoningOptions(budget: ReasoningBudget): ProviderOptions | undefined {
    const budgetTokens = this.budgetToTokens(budget)
    return {
      vertex: {
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

  override normalizeError(error: unknown): ProviderError {
    return normalizeVertexError(error)
  }

  override isRetryable(error: unknown): boolean {
    return isVertexRetryable(error)
  }
}
