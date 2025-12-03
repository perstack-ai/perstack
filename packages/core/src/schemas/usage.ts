import { z } from "zod"

/** Token usage statistics for a single step or run */
export interface Usage {
  /** Number of tokens in the input prompt */
  inputTokens: number
  /** Number of tokens generated in the response */
  outputTokens: number
  /** Number of tokens used for reasoning (extended thinking) */
  reasoningTokens: number
  /** Total tokens (input + output) */
  totalTokens: number
  /** Number of input tokens served from cache */
  cachedInputTokens: number
}

export const usageSchema = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
  reasoningTokens: z.number(),
  totalTokens: z.number(),
  cachedInputTokens: z.number(),
})
usageSchema satisfies z.ZodType<Usage>
