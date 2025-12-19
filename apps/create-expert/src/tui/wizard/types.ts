export type LLMProvider = "anthropic" | "openai" | "google"

export interface LLMInfo {
  provider: LLMProvider
  displayName: string
  envVar: string
  available: boolean
  defaultModel: string
}

export type RuntimeType = "cursor" | "claude-code" | "gemini"

export interface RuntimeInfo {
  type: RuntimeType
  available: boolean
  version?: string
}

export interface WizardResult {
  runtime: "default" | RuntimeType
  provider?: LLMProvider
  model?: string
  apiKey?: string
  expertDescription?: string
}

export interface WizardOptions {
  llms: LLMInfo[]
  runtimes: RuntimeInfo[]
  isImprovement?: boolean
  improvementTarget?: string
}
