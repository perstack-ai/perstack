import { createApiClient, type RegistryExpert } from "@perstack/api-client"
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
  const client = createApiClient({
    baseUrl: clientOptions.perstackApiBaseUrl,
    apiKey: clientOptions.perstackApiKey,
  })
  const result = await client.registry.experts.get(expertKey)
  if (!result.ok) {
    throw new Error(`Failed to resolve expert "${expertKey}": ${result.error.message}`)
  }
  return toRuntimeExpert(result.data)
}

function toRuntimeExpert(expert: RegistryExpert): Expert {
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
