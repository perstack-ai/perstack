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

/** Callbacks for streaming text generation */
export interface StreamCallbacks {
  /** Called when reasoning stream starts */
  onReasoningStart?: () => void
  /** Called for each reasoning delta */
  onReasoningDelta?: (delta: string) => void
  /** Called when reasoning phase completes (before result phase starts) */
  onReasoningComplete?: (text: string) => void
  /** Called when result stream starts */
  onResultStart?: () => void
  /** Called for each result delta */
  onResultDelta?: (delta: string) => void
  /** Called when result phase completes */
  onResultComplete?: (text: string) => void
}

/** Parameters for streaming text generation */
export interface StreamTextParams {
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
