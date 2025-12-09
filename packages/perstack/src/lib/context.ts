import type { Checkpoint, PerstackConfig, ProviderConfig, ProviderName } from "@perstack/core"
import { getEnv } from "./get-env.js"
import { getPerstackConfig } from "./perstack-toml.js"
import { getProviderConfig } from "./provider-config.js"
import { findCheckpointInJob, getMostRecentCheckpoint, getMostRecentRunInJob } from "./run-manager.js"

const defaultProvider: ProviderName = "anthropic"
const defaultModel = "claude-sonnet-4-5"

export type ExpertConfig = NonNullable<PerstackConfig["experts"]>[string]

export type RunContext = {
  perstackConfig: PerstackConfig
  checkpoint: Checkpoint | undefined
  env: Record<string, string>
  providerConfig: ProviderConfig
  model: string
  experts: Record<string, ExpertConfig & { name: string; version: string }>
}

export type ResolveRunContextInput = {
  configPath?: string
  provider?: string
  model?: string
  envPath?: string[]
  continue?: boolean
  continueJob?: string
  resumeFrom?: string
  expertKey?: string
}

export async function resolveRunContext(input: ResolveRunContextInput): Promise<RunContext> {
  const perstackConfig = await getPerstackConfig(input.configPath)
  let checkpoint: Checkpoint | undefined
  if (input.resumeFrom) {
    if (!input.continue && !input.continueJob) {
      throw new Error("--resume-from requires --continue or --continue-job")
    }
    const jobId = input.continueJob ?? (await getMostRecentCheckpoint()).jobId
    checkpoint = await findCheckpointInJob(jobId, input.resumeFrom)
  } else if (input.continueJob) {
    const run = await getMostRecentRunInJob(input.continueJob)
    checkpoint = await getMostRecentCheckpoint(run.jobId, run.runId)
  } else if (input.continue) {
    checkpoint = await getMostRecentCheckpoint()
  }
  if ((input.continue || input.continueJob || input.resumeFrom) && !checkpoint) {
    throw new Error("No checkpoint found")
  }

  if (checkpoint && input.expertKey && checkpoint.expert.key !== input.expertKey) {
    throw new Error(
      `Checkpoint expert key ${checkpoint.expert.key} does not match input expert key ${input.expertKey}`,
    )
  }

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
    checkpoint,
    env,
    providerConfig,
    model,
    experts: experts as Record<string, ExpertConfig & { name: string; version: string }>,
  }
}
