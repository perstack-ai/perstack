import type { ReasoningBudget } from "@perstack/core"
import type { ProviderAdapter, ProviderOptions } from "@perstack/provider-core"
import { generateText, type LanguageModel, streamText } from "ai"
import type {
  GenerateTextParams,
  LLMExecutionResult,
  StreamCallbacks,
  StreamTextParams,
} from "./types.js"

/** Check if reasoning should be enabled based on budget value */
const shouldEnableReasoning = (budget: ReasoningBudget | undefined): boolean =>
  budget !== undefined && budget !== "none" && budget !== 0

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
    const reasoningEnabled = shouldEnableReasoning(params.reasoningBudget)
    const reasoningOptions =
      reasoningEnabled && params.reasoningBudget
        ? this.adapter.getReasoningOptions(params.reasoningBudget)
        : undefined
    const providerOptions = this.mergeProviderOptions(baseProviderOptions, reasoningOptions)

    try {
      const result = await generateText({
        model: this.model,
        messages: params.messages,
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
    const reasoningEnabled = shouldEnableReasoning(params.reasoningBudget)
    const reasoningOptions =
      reasoningEnabled && params.reasoningBudget
        ? this.adapter.getReasoningOptions(params.reasoningBudget)
        : undefined
    const providerOptions = this.mergeProviderOptions(baseProviderOptions, reasoningOptions)

    try {
      const result = await generateText({
        model: this.model,
        messages: params.messages,
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

  async streamText(
    params: StreamTextParams,
    callbacks: StreamCallbacks,
  ): Promise<LLMExecutionResult> {
    const providerTools = this.adapter.getProviderTools(
      params.providerToolNames ?? [],
      params.providerToolOptions,
    )
    const baseProviderOptions = this.adapter.getProviderOptions(params.providerOptionsConfig)
    const reasoningEnabled = shouldEnableReasoning(params.reasoningBudget)
    const reasoningOptions =
      reasoningEnabled && params.reasoningBudget
        ? this.adapter.getReasoningOptions(params.reasoningBudget)
        : undefined
    const providerOptions = this.mergeProviderOptions(baseProviderOptions, reasoningOptions)

    const streamResult = streamText({
      model: this.model,
      messages: params.messages,
      maxRetries: params.maxRetries,
      tools: { ...params.tools, ...providerTools },
      toolChoice: params.toolChoice,
      abortSignal: params.abortSignal,
      providerOptions,
    })

    let reasoningStarted = false
    let reasoningCompleted = false
    let resultStarted = false
    let accumulatedReasoning = ""

    try {
      // Iterate over fullStream to emit streaming events
      for await (const part of streamResult.fullStream) {
        const partType = (part as { type?: unknown }).type
        const partText = (part as { text?: unknown }).text

        const isReasoningChunk =
          (partType === "reasoning-delta" ||
            partType === "reasoning" ||
            partType === "thinking-delta" ||
            partType === "thinking") &&
          typeof partText === "string"

        const isTextChunk = (partType === "text-delta" || partType === "text") && typeof partText === "string"

        if (isReasoningChunk) {
          if (!reasoningStarted) {
            callbacks.onReasoningStart?.()
            reasoningStarted = true
          }
          accumulatedReasoning += partText
          callbacks.onReasoningDelta?.(partText)
        }
        if (isTextChunk) {
          // Complete reasoning phase before starting result phase
          if (reasoningStarted && !reasoningCompleted) {
            callbacks.onReasoningComplete?.(accumulatedReasoning)
            reasoningCompleted = true
          }
          if (!resultStarted) {
            callbacks.onResultStart?.()
            resultStarted = true
          }
          callbacks.onResultDelta?.(partText)
        }
      }

      // If reasoning was started but never completed (no text-delta received),
      // complete it now
      if (reasoningStarted && !reasoningCompleted) {
        callbacks.onReasoningComplete?.(accumulatedReasoning)
        reasoningCompleted = true
      }

      // After fullStream is consumed, await the final result
      // The streamText result object caches these values during streaming
      const text = await streamResult.text
      const toolCalls = await streamResult.toolCalls
      const finishReason = await streamResult.finishReason
      const usage = await streamResult.usage
      const reasoning = await streamResult.reasoning
      const response = await streamResult.response

      // Construct a result compatible with GenerateTextResult
      const result = {
        text,
        toolCalls,
        finishReason,
        usage,
        reasoning,
        response,
        // These properties are required by GenerateTextResult but not available in streamText
        // They're optional or have safe defaults
        toolResults: [] as never[],
        steps: [],
        experimental_output: undefined,
        providerMetadata: undefined,
        request: { body: "" },
      }

      return { success: true, result: result as never }
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
