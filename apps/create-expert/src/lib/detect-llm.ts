import type { LLMInfo, LLMProvider } from "@perstack/tui"

const LLM_CONFIGS: Record<
  LLMProvider,
  { envVar: string; displayName: string; defaultModel: string }
> = {
  anthropic: {
    envVar: "ANTHROPIC_API_KEY",
    displayName: "Anthropic (Claude)",
    defaultModel: "claude-sonnet-4-5",
  },
  openai: { envVar: "OPENAI_API_KEY", displayName: "OpenAI", defaultModel: "gpt-4o" },
  google: {
    envVar: "GOOGLE_GENERATIVE_AI_API_KEY",
    displayName: "Google (Gemini)",
    defaultModel: "gemini-2.5-pro",
  },
}

export function detectLLM(provider: LLMProvider): LLMInfo {
  const config = LLM_CONFIGS[provider]
  return {
    provider,
    envVar: config.envVar,
    available: Boolean(process.env[config.envVar]),
    displayName: config.displayName,
    defaultModel: config.defaultModel,
  }
}

export function detectAllLLMs(): LLMInfo[] {
  return (Object.keys(LLM_CONFIGS) as LLMProvider[]).map(detectLLM)
}

export function getAvailableLLMs(): LLMInfo[] {
  return detectAllLLMs().filter((l) => l.available)
}

export function getDefaultModel(provider: LLMProvider): string {
  return LLM_CONFIGS[provider].defaultModel
}
