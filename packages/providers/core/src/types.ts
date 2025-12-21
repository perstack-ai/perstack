import type { ProviderName, ReasoningBudget } from "@perstack/core"
import type { JSONValue, LanguageModel, ToolSet } from "ai"

export type { ReasoningBudget }

export type ProviderOptions = Record<string, Record<string, JSONValue>>

export interface ProviderToolOptions {
  webSearch?: {
    maxUses?: number
    allowedDomains?: string[]
  }
  webFetch?: {
    maxUses?: number
  }
  fileSearch?: {
    vectorStoreIds?: string[]
    maxNumResults?: number
  }
  codeExecution?: Record<string, unknown>
  codeInterpreter?: Record<string, unknown>
  imageGeneration?: Record<string, unknown>
  googleSearch?: Record<string, unknown>
  urlContext?: Record<string, unknown>
  googleMaps?: {
    retrievalConfig?: Record<string, unknown>
  }
}

export interface BuiltinAnthropicSkill {
  type: "builtin"
  skillId: "pdf" | "docx" | "pptx" | "xlsx"
}

export interface CustomAnthropicSkill {
  type: "custom"
  name: string
  definition: string
}

export type AnthropicProviderSkill = BuiltinAnthropicSkill | CustomAnthropicSkill

export interface ProviderOptionsConfig {
  skills?: AnthropicProviderSkill[]
}

export interface ProviderError {
  name: string
  message: string
  statusCode?: number
  isRetryable: boolean
  provider: ProviderName
  originalError?: unknown
}

export interface ProviderAdapterOptions {
  proxyUrl?: string
}

export interface ProviderAdapter {
  readonly providerName: ProviderName

  createModel(modelId: string): LanguageModel

  getProviderTools(toolNames: string[], options?: ProviderToolOptions): ToolSet

  getProviderOptions(config?: ProviderOptionsConfig): ProviderOptions | undefined

  /**
   * Get provider-specific reasoning options for native LLM reasoning (extended thinking).
   * Returns undefined if the provider doesn't support reasoning or budget is not set.
   */
  getReasoningOptions(budget: ReasoningBudget): ProviderOptions | undefined

  normalizeError(error: unknown): ProviderError

  isRetryable(error: unknown): boolean
}

export type ProviderAdapterConstructor = {
  new (config: Record<string, unknown>, options?: ProviderAdapterOptions): ProviderAdapter
}
