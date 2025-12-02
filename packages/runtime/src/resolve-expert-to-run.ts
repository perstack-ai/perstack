import { type ApiRegistryExpert, ApiV1Client } from "@perstack/api-client/v1"
import type { Expert, Skill } from "@perstack/core"

export async function resolveExpertToRun(
  expertKey: string,
  experts: Record<string, Expert>,
  clientOptions: {
    perstackApiBaseUrl: string
    perstackApiKey?: string
  },
): Promise<Expert> {
  if (experts[expertKey]) {
    return experts[expertKey]
  }
  const client = new ApiV1Client({
    baseUrl: clientOptions.perstackApiBaseUrl,
    apiKey: clientOptions.perstackApiKey,
  })
  const { expert } = await client.registry.experts.get({ expertKey })
  experts[expertKey] = toRuntimeExpert(expert)
  return experts[expertKey]
}

function toRuntimeExpert(expert: ApiRegistryExpert): Expert {
  const skills: Record<string, Skill> = Object.fromEntries(
    Object.entries(expert.skills).map(([name, skill]) => {
      switch (skill.type) {
        case "mcpStdioSkill":
          return [name, { ...skill, name }]
        case "mcpSseSkill":
          return [name, { ...skill, name }]
        case "interactiveSkill":
          return [name, { ...skill, name }]
        default: {
          throw new Error(`Unknown skill type: ${(skill as { type: string }).type}`)
        }
      }
    }),
  )
  return { ...expert, skills }
}
