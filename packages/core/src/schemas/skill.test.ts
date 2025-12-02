import { describe, expect, it } from "vitest"
import { interactiveSkillSchema, mcpSseSkillSchema, mcpStdioSkillSchema } from "./skill.js"

describe("@perstack/core: mcpStdioSkillSchema", () => {
  it("parses valid mcp stdio skill", () => {
    const result = mcpStdioSkillSchema.parse({
      type: "mcpStdioSkill",
      name: "test-skill",
      command: "npx",
      args: ["-y", "test"],
    })
    expect(result.type).toBe("mcpStdioSkill")
    expect(result.name).toBe("test-skill")
    expect(result.pick).toEqual([])
    expect(result.omit).toEqual([])
    expect(result.lazyInit).toBe(true)
  })

  it("applies default values", () => {
    const result = mcpStdioSkillSchema.parse({
      type: "mcpStdioSkill",
      name: "test-skill",
      command: "npx",
    })
    expect(result.pick).toEqual([])
    expect(result.omit).toEqual([])
    expect(result.args).toEqual([])
    expect(result.requiredEnv).toEqual([])
    expect(result.lazyInit).toBe(true)
  })
})

describe("@perstack/core: mcpSseSkillSchema", () => {
  it("parses valid mcp sse skill", () => {
    const result = mcpSseSkillSchema.parse({
      type: "mcpSseSkill",
      name: "sse-skill",
      endpoint: "https://example.com/sse",
    })
    expect(result.type).toBe("mcpSseSkill")
    expect(result.endpoint).toBe("https://example.com/sse")
  })
})

describe("@perstack/core: interactiveSkillSchema", () => {
  it("parses interactive skill with tools transform", () => {
    const result = interactiveSkillSchema.parse({
      type: "interactiveSkill",
      name: "interactive-skill",
      tools: {
        "ask-user": {
          description: "Ask user a question",
          inputJsonSchema: '{"type": "object"}',
        },
      },
    })
    expect(result.type).toBe("interactiveSkill")
    expect(result.tools["ask-user"].name).toBe("ask-user")
    expect(result.tools["ask-user"].description).toBe("Ask user a question")
  })

  it("transforms multiple tools correctly", () => {
    const result = interactiveSkillSchema.parse({
      type: "interactiveSkill",
      name: "multi-tool-skill",
      tools: {
        "tool-a": { inputJsonSchema: '{}' },
        "tool-b": { inputJsonSchema: '{}' },
      },
    })
    expect(result.tools["tool-a"].name).toBe("tool-a")
    expect(result.tools["tool-b"].name).toBe("tool-b")
  })
})
