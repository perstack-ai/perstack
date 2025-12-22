import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock"
import type { AmazonBedrockProviderConfig } from "@perstack/core"
import {
  BaseProviderAdapter,
  type ProviderAdapterOptions,
  type ProviderError,
  type ProviderOptions,
  type ProviderOptionsConfig,
  type ReasoningBudget,
} from "@perstack/provider-core"
import type { JSONValue, LanguageModel } from "ai"
import { isBedrockRetryable, normalizeBedrockError } from "./errors.js"

export class BedrockProviderAdapter extends BaseProviderAdapter {
  readonly providerName = "amazon-bedrock" as const
  private readonly client: ReturnType<typeof createAmazonBedrock>

  constructor(
    readonly config: AmazonBedrockProviderConfig,
    options?: ProviderAdapterOptions,
  ) {
    super(options)
    this.client = createAmazonBedrock({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region,
      sessionToken: config.sessionToken,
      fetch: options?.proxyUrl ? this.createProxyFetch(options.proxyUrl) : undefined,
    })
  }

  override createModel(modelId: string): LanguageModel {
    return this.client(modelId)
  }

  override getProviderOptions(config?: ProviderOptionsConfig): ProviderOptions | undefined {
    if (!config?.guardrails && !config?.cachePoint) {
      return undefined
    }
    const bedrockOptions: Record<string, JSONValue> = {}
    if (config.guardrails) {
      const guardrailConfig: Record<string, JSONValue> = {
        guardrailIdentifier: config.guardrails.guardrailIdentifier,
        guardrailVersion: config.guardrails.guardrailVersion,
      }
      if (config.guardrails.trace) {
        guardrailConfig["trace"] = config.guardrails.trace
      }
      bedrockOptions["guardrailConfig"] = guardrailConfig
    }
    if (config.cachePoint) {
      bedrockOptions["cachePoint"] = { type: config.cachePoint.type }
    }
    return { bedrock: bedrockOptions }
  }

  override getReasoningOptions(budget: ReasoningBudget): ProviderOptions | undefined {
    if (budget === "none" || budget === 0) {
      return undefined
    }
    const budgetTokens = this.budgetToTokens(budget)
    return {
      bedrock: {
        reasoning: {
          budgetTokens,
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
    return normalizeBedrockError(error)
  }

  override isRetryable(error: unknown): boolean {
    return isBedrockRetryable(error)
  }
}
