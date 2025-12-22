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

export interface BedrockGuardrailConfig {
  guardrailIdentifier: string
  guardrailVersion: string
  trace?: "enabled" | "disabled"
}

export interface BedrockCachePointConfig {
  type: "default"
}

export interface VertexSafetySettingConfig {
  category:
    | "HARM_CATEGORY_UNSPECIFIED"
    | "HARM_CATEGORY_HATE_SPEECH"
    | "HARM_CATEGORY_DANGEROUS_CONTENT"
    | "HARM_CATEGORY_HARASSMENT"
    | "HARM_CATEGORY_SEXUALLY_EXPLICIT"
  threshold:
    | "HARM_BLOCK_THRESHOLD_UNSPECIFIED"
    | "BLOCK_LOW_AND_ABOVE"
    | "BLOCK_MEDIUM_AND_ABOVE"
    | "BLOCK_ONLY_HIGH"
    | "BLOCK_NONE"
}

export interface ProviderOptionsConfig {
  // Anthropic
  skills?: AnthropicProviderSkill[]
  // Bedrock
  guardrails?: BedrockGuardrailConfig
  cachePoint?: BedrockCachePointConfig
  // Vertex
  safetySettings?: VertexSafetySettingConfig[]
  // Ollama
  think?: boolean
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
