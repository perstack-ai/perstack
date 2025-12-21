import type { ProviderName } from "@perstack/core"
import type { LanguageModel, ToolSet } from "ai"
import { ProxyAgent, fetch as undiciFetch } from "undici"
import type {
  ProviderAdapter,
  ProviderAdapterOptions,
  ProviderError,
  ProviderOptions,
  ProviderOptionsConfig,
  ProviderToolOptions,
  ReasoningBudget,
} from "./types.js"

export abstract class BaseProviderAdapter implements ProviderAdapter {
  abstract readonly providerName: ProviderName
  protected readonly options?: ProviderAdapterOptions

  constructor(options?: ProviderAdapterOptions) {
    this.options = options
  }

  abstract createModel(modelId: string): LanguageModel

  getProviderTools(_toolNames: string[], _options?: ProviderToolOptions): ToolSet {
    return {}
  }

  getProviderOptions(_config?: ProviderOptionsConfig): ProviderOptions | undefined {
    return undefined
  }

  getReasoningOptions(_budget: ReasoningBudget): ProviderOptions | undefined {
    return undefined
  }

  normalizeError(error: unknown): ProviderError {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        isRetryable: this.isRetryable(error),
        provider: this.providerName,
        originalError: error,
      }
    }
    return {
      name: "UnknownError",
      message: String(error),
      isRetryable: false,
      provider: this.providerName,
      originalError: error,
    }
  }

  isRetryable(error: unknown): boolean {
    if (error instanceof Error) {
      const retryablePatterns = [
        /rate limit/i,
        /timeout/i,
        /overloaded/i,
        /service unavailable/i,
        /internal server error/i,
        /bad gateway/i,
        /gateway timeout/i,
      ]
      return retryablePatterns.some((pattern) => pattern.test(error.message))
    }
    return false
  }

  protected createProxyFetch(proxyUrl: string): typeof globalThis.fetch {
    const agent = new ProxyAgent(proxyUrl)
    return (input, init) => {
      return undiciFetch(input, { ...init, dispatcher: agent }) as Promise<Response>
    }
  }
}
