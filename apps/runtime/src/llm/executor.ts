import type { ProviderAdapter } from "@perstack/provider-core"
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
    const providerOptions = this.adapter.getProviderOptions(params.providerOptionsConfig)

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

  async generateTextWithoutTools(
    params: Omit<
      GenerateTextParams,
      "tools" | "toolChoice" | "providerToolNames" | "providerToolOptions"
    >,
  ): Promise<LLMExecutionResult> {
    const providerOptions = this.adapter.getProviderOptions(params.providerOptionsConfig)

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
