import type { ReasoningBudget } from "@perstack/core"
import type {
  ProviderError,
  ProviderOptionsConfig,
  ProviderToolOptions,
} from "@perstack/provider-core"
import type { GenerateTextResult, ModelMessage, ToolSet } from "ai"

export interface GenerateTextParams {
  messages: ModelMessage[]
  reasoningBudget?: ReasoningBudget
  maxRetries: number
  tools: ToolSet
  toolChoice?: "auto" | "none" | "required" | { type: "tool"; toolName: string }
  abortSignal?: AbortSignal
  providerToolNames?: string[]
  providerToolOptions?: ProviderToolOptions
  providerOptionsConfig?: ProviderOptionsConfig
}

export type LLMExecutionResult =
  | { success: true; result: GenerateTextResult<ToolSet, never> }
  | { success: false; error: ProviderError; isRetryable: boolean }
