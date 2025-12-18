type ProviderConfig = {
  provider: "openai" | "anthropic" | "google"
  model: string
}

const CHEAP_MODELS: ProviderConfig[] = [
  { provider: "openai", model: "gpt-5-nano" },
  { provider: "anthropic", model: "claude-haiku-4-5" },
  { provider: "google", model: "gemini-2.5-flash-lite" },
]

let currentIndex = 0

export function getNextProvider(): ProviderConfig {
  const config = CHEAP_MODELS[currentIndex]
  currentIndex = (currentIndex + 1) % CHEAP_MODELS.length
  return config
}

export function resetRoundRobin(): void {
  currentIndex = 0
}

export function getCurrentIndex(): number {
  return currentIndex
}

export function injectProviderArgs(args: string[]): string[] {
  const { provider, model } = getNextProvider()
  const hasProvider = args.some((arg) => arg === "--provider")
  const hasModel = args.some((arg) => arg === "--model")
  const result = [...args]
  if (!hasProvider) {
    result.push("--provider", provider)
  }
  if (!hasModel) {
    result.push("--model", model)
  }
  return result
}

