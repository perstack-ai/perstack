// Fixed provider/model for E2E tests
// - OpenAI: excluded due to reasoning overhead (~64s vs ~17s), see #194
// - Google: excluded due to empty text bug in delegation, see #195
const DEFAULT_PROVIDER = "anthropic"
const DEFAULT_MODEL = "claude-haiku-4-5"

export function injectProviderArgs(args: string[]): string[] {
  const hasProvider = args.some((arg) => arg === "--provider")
  const hasModel = args.some((arg) => arg === "--model")
  const result = [...args]
  if (!hasProvider) {
    result.push("--provider", DEFAULT_PROVIDER)
  }
  if (!hasModel) {
    result.push("--model", DEFAULT_MODEL)
  }
  return result
}
