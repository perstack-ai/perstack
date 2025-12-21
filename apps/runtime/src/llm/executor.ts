import type { ProviderAdapter, ProviderOptions } from "@perstack/provider-core"
import { generateText, type LanguageModel } from "ai"
import type { GenerateTextParams, LLMExecutionResult } from "./types.js"

export class LLMExecutor {
  constructor(
    private readonly adapter: ProviderAdapter,
    private readonly model: LanguageModel,
  ) {}

  async generateText(params: GenerateTextParams): Promise<LLMExecutionResult> {
    const providerTools = this.adapter.getProviderTools(
      params.providerToolNames ?? [],
      params.providerToolOptions,
    )
    const baseProviderOptions = this.adapter.getProviderOptions(params.providerOptionsConfig)
    const reasoningOptions = params.reasoningBudget
      ? this.adapter.getReasoningOptions(params.reasoningBudget)
      : undefined
    const providerOptions = this.mergeProviderOptions(baseProviderOptions, reasoningOptions)

    try {
      const result = await generateText({
        model: this.model,
        messages: params.messages,
        temperature: params.temperature,
        maxRetries: params.maxRetries,
        tools: { ...params.tools, ...providerTools },
        toolChoice: params.toolChoice,
        abortSignal: params.abortSignal,
        providerOptions,
      })
      return { success: true, result }
    } catch (error) {
      const providerError = this.adapter.normalizeError(error)
      return {
        success: false,
        error: providerError,
        isRetryable: this.adapter.isRetryable(error),
      }
    }
  }

  private mergeProviderOptions(
    ...options: (ProviderOptions | undefined)[]
  ): ProviderOptions | undefined {
    const defined = options.filter(Boolean) as ProviderOptions[]
    if (defined.length === 0) return undefined
    const result: ProviderOptions = {}
    for (const opt of defined) {
      for (const [provider, settings] of Object.entries(opt)) {
        result[provider] = { ...result[provider], ...settings }
      }
    }
    return result
  }

  async generateTextWithoutTools(
    params: Omit<
      GenerateTextParams,
      "tools" | "toolChoice" | "providerToolNames" | "providerToolOptions"
    >,
  ): Promise<LLMExecutionResult> {
    const baseProviderOptions = this.adapter.getProviderOptions(params.providerOptionsConfig)
    const reasoningOptions = params.reasoningBudget
      ? this.adapter.getReasoningOptions(params.reasoningBudget)
      : undefined
    const providerOptions = this.mergeProviderOptions(baseProviderOptions, reasoningOptions)

    try {
      const result = await generateText({
        model: this.model,
        messages: params.messages,
        temperature: params.temperature,
        maxRetries: params.maxRetries,
        abortSignal: params.abortSignal,
        providerOptions,
      })
      return { success: true, result }
    } catch (error) {
      const providerError = this.adapter.normalizeError(error)
      return {
        success: false,
        error: providerError,
        isRetryable: this.adapter.isRetryable(error),
      }
    }
  }
}
