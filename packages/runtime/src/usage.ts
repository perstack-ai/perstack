import type { Usage } from "@perstack/core"
import type { GenerateTextResult, ToolSet } from "ai"

export function createEmptyUsage(): Usage {
  return {
    inputTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    totalTokens: 0,
    cachedInputTokens: 0,
  }
}

export function usageFromGenerateTextResult(result: GenerateTextResult<ToolSet, never>): Usage {
  return {
    inputTokens: result.usage.inputTokens || 0,
    outputTokens: result.usage.outputTokens || 0,
    reasoningTokens: result.usage.reasoningTokens || 0,
    totalTokens: result.usage.totalTokens || 0,
    cachedInputTokens: result.usage.cachedInputTokens || 0,
  }
}

export function sumUsage(a: Usage, b: Usage): Usage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    reasoningTokens: a.reasoningTokens + b.reasoningTokens,
    totalTokens: a.totalTokens + b.totalTokens,
    cachedInputTokens: a.cachedInputTokens + b.cachedInputTokens,
  }
}
