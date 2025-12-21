import type { ThinkingPart } from "@perstack/core"

/**
 * Reasoning part from AI SDK generateText result.
 * This matches the AI SDK ReasoningPart type.
 *
 * For Anthropic Extended Thinking, signature is in providerMetadata.anthropic.signature
 * (not providerOptions - that's for input, providerMetadata is for output)
 */
export interface ReasoningPart {
  type: "reasoning"
  text: string
  providerMetadata?: {
    anthropic?: {
      signature?: string
    }
  }
}

/**
 * Extract ThinkingPart array from AI SDK reasoning.
 * Used to preserve thinking blocks in conversation history for providers
 * that require them (Anthropic, Google).
 *
 * Note: For Anthropic, signature is required for all thinking blocks
 * when including them in conversation history.
 */
export function extractThinkingParts(
  reasoning: ReasoningPart[] | undefined,
): Omit<ThinkingPart, "id">[] {
  if (!reasoning) return []
  return reasoning.map((r) => ({
    type: "thinkingPart" as const,
    thinking: r.text,
    // Signature is in providerMetadata for Anthropic (output from API)
    signature: r.providerMetadata?.anthropic?.signature,
  }))
}

/**
 * Extract thinking text from AI SDK reasoning as a single string.
 * Used for the completeRun event's thinking field.
 */
export function extractThinkingText(reasoning: ReasoningPart[] | undefined): string {
  if (!reasoning) return ""
  return reasoning
    .filter((r) => r.text)
    .map((r) => r.text)
    .join("\n")
}

// Re-export for backwards compatibility
export type { ReasoningPart as ReasoningDetail }
