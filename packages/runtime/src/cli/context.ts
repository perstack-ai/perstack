import type { PerstackConfig, ProviderConfig, ProviderName } from "@perstack/core"
import { getEnv } from "./get-env.js"
import { getPerstackConfig } from "./perstack-toml.js"
import { getProviderConfig } from "./provider-config.js"

const defaultProvider: ProviderName = "anthropic"
const defaultModel = "claude-sonnet-4-5"

export type ExpertConfig = NonNullable<PerstackConfig["experts"]>[string]

export type RunContext = {
  perstackConfig: PerstackConfig
  env: Record<string, string>
  providerConfig: ProviderConfig
  model: string
  experts: Record<string, ExpertConfig & { key: string; name: string; version: string }>
}

export type ResolveRunContextInput = {
  configPath?: string
  provider?: string
  model?: string
  envPath?: string[]
}

export async function resolveRunContext(input: ResolveRunContextInput): Promise<RunContext> {
  const perstackConfig = await getPerstackConfig(input.configPath)
  const env = getEnv(input.envPath ?? perstackConfig.envPath ?? [".env", ".env.local"])
  const provider = (input.provider ??
    perstackConfig.provider?.providerName ??
    defaultProvider) as ProviderName
  const model = input.model ?? perstackConfig.model ?? defaultModel
  const providerConfig = getProviderConfig(provider, env, perstackConfig.provider)
  const experts = Object.fromEntries(
    Object.entries(perstackConfig.experts ?? {}).map(([name, expert]) => {
      return [
        name,
        {
          key: name,
          name,
          version: expert.version ?? "1.0.0",
          description: expert.description,
          instruction: expert.instruction,
          skills: expert.skills,
          delegates: expert.delegates,
          tags: expert.tags,
        },
      ]
    }),
  )
  return {
    perstackConfig,
    env,
    providerConfig,
    model,
    experts: experts as Record<string, ExpertConfig & { key: string; name: string; version: string }>,
  }
}
