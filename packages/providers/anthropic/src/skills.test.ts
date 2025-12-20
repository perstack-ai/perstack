import type { AnthropicProviderSkill } from "@perstack/provider-core"
import { describe, expect, it } from "vitest"
import { buildProviderOptions, hasCustomProviderSkills } from "./skills.js"

describe("buildProviderOptions", () => {
  it("returns undefined for undefined skills", () => {
    const result = buildProviderOptions(undefined)
    expect(result).toBeUndefined()
  })

  it("returns undefined for empty skills array", () => {
    const result = buildProviderOptions([])
    expect(result).toBeUndefined()
  })

  it("builds provider options for builtin skill", () => {
    const skills: AnthropicProviderSkill[] = [{ type: "builtin", skillId: "computer_use" }]
    const result = buildProviderOptions(skills)
    expect(result).toEqual({
      anthropic: {
        container: {
          skills: [{ type: "builtin", name: "computer_use" }],
        },
      },
    })
  })

  it("builds provider options for custom skill with valid JSON", () => {
    const skills: AnthropicProviderSkill[] = [
      {
        type: "custom",
        name: "my-tool",
        definition: '{"command": "npx", "args": ["-y", "my-tool"]}',
      },
    ]
    const result = buildProviderOptions(skills)
    expect(result).toEqual({
      anthropic: {
        container: {
          skills: [
            {
              type: "custom",
              name: "my-tool",
              mcp_config: { command: "npx", args: ["-y", "my-tool"] },
            },
          ],
        },
      },
    })
  })

  it("throws error for custom skill with invalid JSON", () => {
    const skills: AnthropicProviderSkill[] = [
      {
        type: "custom",
        name: "bad-tool",
        definition: "not valid json",
      },
    ]
    expect(() => buildProviderOptions(skills)).toThrow(
      /Invalid JSON in custom skill definition for "bad-tool"/,
    )
  })
})

describe("hasCustomProviderSkills", () => {
  it("returns false for undefined skills", () => {
    expect(hasCustomProviderSkills(undefined)).toBe(false)
  })

  it("returns false for empty skills array", () => {
    expect(hasCustomProviderSkills([])).toBe(false)
  })

  it("returns false for only builtin skills", () => {
    const skills: AnthropicProviderSkill[] = [{ type: "builtin", skillId: "computer_use" }]
    expect(hasCustomProviderSkills(skills)).toBe(false)
  })

  it("returns true for custom skills", () => {
    const skills: AnthropicProviderSkill[] = [{ type: "custom", name: "my-tool", definition: "{}" }]
    expect(hasCustomProviderSkills(skills)).toBe(true)
  })

  it("returns true for mixed skills with at least one custom", () => {
    const skills: AnthropicProviderSkill[] = [
      { type: "builtin", skillId: "computer_use" },
      { type: "custom", name: "my-tool", definition: "{}" },
    ]
    expect(hasCustomProviderSkills(skills)).toBe(true)
  })
})
