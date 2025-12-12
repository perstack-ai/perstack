import type { PerstackConfig, ProviderTable } from "@perstack/core"

export type EnvRequirement = {
  name: string
  source: "provider" | "skill" | "runtime"
  required: boolean
}

export function getProviderEnvKeys(provider?: ProviderTable): string[] {
  if (!provider) return []
  switch (provider.providerName) {
    case "anthropic":
      return ["ANTHROPIC_API_KEY"]
    case "openai":
      return ["OPENAI_API_KEY"]
    case "google":
      return ["GOOGLE_API_KEY"]
    case "azure-openai":
      return ["AZURE_OPENAI_API_KEY"]
    case "amazon-bedrock":
      return ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION"]
    case "google-vertex":
      return ["GOOGLE_APPLICATION_CREDENTIALS"]
    case "deepseek":
      return ["DEEPSEEK_API_KEY"]
    case "ollama":
      return []
    default:
      return []
  }
}

export function extractRequiredEnvVars(
  config: PerstackConfig,
  expertKey: string,
): EnvRequirement[] {
  const requirements: EnvRequirement[] = []
  const providerEnvKeys = getProviderEnvKeys(config.provider)
  for (const key of providerEnvKeys) {
    requirements.push({
      name: key,
      source: "provider",
      required: true,
    })
  }
  const expert = config.experts?.[expertKey]
  if (expert?.skills) {
    for (const skill of Object.values(expert.skills)) {
      if (skill.type !== "mcpStdioSkill") continue
      const requiredEnv = (skill as { requiredEnv?: string[] }).requiredEnv ?? []
      for (const envName of requiredEnv) {
        if (!requirements.some((r) => r.name === envName)) {
          requirements.push({
            name: envName,
            source: "skill",
            required: true,
          })
        }
      }
    }
  }
  requirements.push({
    name: "PERSTACK_API_KEY",
    source: "runtime",
    required: false,
  })
  return requirements
}

export function resolveEnvValues(
  requirements: EnvRequirement[],
  env: Record<string, string | undefined>,
): { resolved: Record<string, string>; missing: string[] } {
  const resolved: Record<string, string> = {}
  const missing: string[] = []
  for (const req of requirements) {
    const value = env[req.name]
    if (value !== undefined) {
      resolved[req.name] = value
    } else if (req.required) {
      missing.push(req.name)
    }
  }
  return { resolved, missing }
}

export function generateDockerEnvArgs(envVars: Record<string, string>): string[] {
  const args: string[] = []
  for (const [key, value] of Object.entries(envVars)) {
    args.push("-e", `${key}=${value}`)
  }
  return args
}

export function generateComposeEnvSection(envKeys: string[]): string {
  if (envKeys.length === 0) {
    return ""
  }
  const lines: string[] = ["    environment:"]
  for (const key of envKeys) {
    lines.push(`      - ${key}`)
  }
  return lines.join("\n")
}
