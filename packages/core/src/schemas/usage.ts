import { z } from "zod"

export const usageSchema = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
  reasoningTokens: z.number(),
  totalTokens: z.number(),
  cachedInputTokens: z.number(),
})
export type Usage = z.infer<typeof usageSchema>
