import type { AnthropicProviderSkill, ProviderOptions } from "@perstack/provider-core"
import type { JSONValue } from "ai"

type AnthropicContainerSkill = {
  type: "builtin"
  name: string
  [key: string]: JSONValue
}

type AnthropicCustomContainerSkill = {
  type: "custom"
  name: string
  mcp_config: Record<string, JSONValue>
  [key: string]: JSONValue
}

type AnthropicSkillConfig = AnthropicContainerSkill | AnthropicCustomContainerSkill

function convertSkill(skill: AnthropicProviderSkill): AnthropicSkillConfig {
  if (skill.type === "builtin") {
    return {
      type: "builtin",
      name: skill.skillId,
    }
  }
  return {
    type: "custom",
    name: skill.name,
    mcp_config: JSON.parse(skill.definition) as Record<string, JSONValue>,
  }
}

export function buildProviderOptions(
  skills?: AnthropicProviderSkill[],
): ProviderOptions | undefined {
  if (!skills || skills.length === 0) {
    return undefined
  }
  return {
    anthropic: {
      container: {
        skills: skills.map(convertSkill),
      },
    },
  }
}

export function hasCustomProviderSkills(skills?: AnthropicProviderSkill[]): boolean {
  return skills?.some((skill) => skill.type === "custom") ?? false
}
