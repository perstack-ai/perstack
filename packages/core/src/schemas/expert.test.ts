import { describe, expect, it } from "vitest"
import { ZodError } from "zod"
import { expertSchema } from "./expert.js"

describe("@perstack/core: expertSchema", () => {
  it("parses valid expert with default skills", () => {
    const result = expertSchema.parse({
      key: "test-expert",
      name: "test-expert",
      version: "1.0.0",
      instruction: "Test instruction",
    })
    expect(result.key).toBe("test-expert")
    expect(result.skills["@perstack/base"]).toBeDefined()
    expect(result.skills["@perstack/base"].name).toBe("@perstack/base")
  })

  it("throws on invalid skill type", () => {
    expect(() =>
      expertSchema.parse({
        key: "test-expert",
        name: "test-expert",
        version: "1.0.0",
        instruction: "Test instruction",
        skills: {
          invalid: {
            type: "invalidSkillType",
            command: "npx",
          },
        },
      }),
    ).toThrow(ZodError)
  })

  it("throws on missing required fields", () => {
    expect(() => expertSchema.parse({})).toThrow(ZodError)
    expect(() => expertSchema.parse({ key: "test" })).toThrow(ZodError)
    expect(() =>
      expertSchema.parse({
        key: "test",
        name: "test",
        version: "1.0.0",
      }),
    ).toThrow(ZodError)
  })

  it("transforms skills to include name", () => {
    const result = expertSchema.parse({
      key: "test-expert",
      name: "test-expert",
      version: "1.0.0",
      instruction: "Test instruction",
      skills: {
        "custom-skill": {
          type: "mcpStdioSkill",
          command: "npx",
          args: ["-y", "custom"],
        },
      },
    })
    expect(result.skills["custom-skill"].name).toBe("custom-skill")
  })

  it("applies default values for delegates and tags", () => {
    const result = expertSchema.parse({
      key: "test-expert",
      name: "test-expert",
      version: "1.0.0",
      instruction: "Test instruction",
    })
    expect(result.delegates).toEqual([])
    expect(result.tags).toEqual([])
  })

  it("parses expert with mcpSseSkill", () => {
    const result = expertSchema.parse({
      key: "sse-expert",
      name: "sse-expert",
      version: "1.0.0",
      instruction: "Test instruction",
      skills: {
        "sse-skill": {
          type: "mcpSseSkill",
          endpoint: "https://example.com/sse",
        },
      },
    })
    expect(result.skills["sse-skill"].type).toBe("mcpSseSkill")
    expect(result.skills["sse-skill"].name).toBe("sse-skill")
  })

  it("parses expert with interactiveSkill", () => {
    const result = expertSchema.parse({
      key: "interactive-expert",
      name: "interactive-expert",
      version: "1.0.0",
      instruction: "Test instruction",
      skills: {
        interactive: {
          type: "interactiveSkill",
          tools: {
            ask: { inputJsonSchema: "{}" },
          },
        },
      },
    })
    expect(result.skills.interactive.type).toBe("interactiveSkill")
    expect(result.skills.interactive.name).toBe("interactive")
  })
})
