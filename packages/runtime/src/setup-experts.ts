import type { Expert, RunSetting } from "@perstack/core"
import { resolveExpertToRun as defaultResolveExpertToRun } from "./resolve-expert-to-run.js"

export type ResolveExpertToRunFn = (
  expertKey: string,
  experts: Record<string, Expert>,
  clientOptions: { perstackApiBaseUrl: string; perstackApiKey?: string },
) => Promise<Expert>

export type SetupExpertsResult = {
  expertToRun: Expert
  experts: Record<string, Expert>
}

export async function setupExperts(
  setting: RunSetting,
  resolveExpertToRun: ResolveExpertToRunFn = defaultResolveExpertToRun,
): Promise<SetupExpertsResult> {
  const { expertKey } = setting
  const experts = { ...setting.experts }
  const clientOptions = {
    perstackApiBaseUrl: setting.perstackApiBaseUrl,
    perstackApiKey: setting.perstackApiKey,
  }
  const expertToRun = await resolveExpertToRun(expertKey, experts, clientOptions)
  for (const delegateName of expertToRun.delegates) {
    const delegate = await resolveExpertToRun(delegateName, experts, clientOptions)
    if (!delegate) {
      throw new Error(`Delegate ${delegateName} not found`)
    }
  }
  return { expertToRun, experts }
}
