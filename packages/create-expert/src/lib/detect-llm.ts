export type LLMProvider = "anthropic" | "openai" | "google"

export interface LLMInfo {
  provider: LLMProvider
  envVar: string
  available: boolean
  displayName: string
}

const LLM_CONFIGS: Record<LLMProvider, { envVar: string; displayName: string }> = {
  anthropic: { envVar: "ANTHROPIC_API_KEY", displayName: "Anthropic (Claude)" },
  openai: { envVar: "OPENAI_API_KEY", displayName: "OpenAI" },
  google: { envVar: "GOOGLE_GENERATIVE_AI_API_KEY", displayName: "Google (Gemini)" },
}

export function detectLLM(provider: LLMProvider): LLMInfo {
  const config = LLM_CONFIGS[provider]
  return {
    provider,
    envVar: config.envVar,
    available: Boolean(process.env[config.envVar]),
    displayName: config.displayName,
  }
}

export function detectAllLLMs(): LLMInfo[] {
  return (Object.keys(LLM_CONFIGS) as LLMProvider[]).map(detectLLM)
}

export function getAvailableLLMs(): LLMInfo[] {
  return detectAllLLMs().filter((l) => l.available)
}

export function getDefaultModel(provider: LLMProvider): string {
  switch (provider) {
    case "anthropic":
      return "claude-sonnet-4-5"
    case "openai":
      return "gpt-4o"
    case "google":
      return "gemini-2.5-pro"
  }
}
