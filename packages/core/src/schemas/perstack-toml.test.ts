import { describe, expect, it } from "vitest"
import { domainPatternSchema, perstackConfigSchema } from "./perstack-toml.js"

describe("domainPatternSchema", () => {
  it("should accept valid exact domain", () => {
    expect(domainPatternSchema.safeParse("api.anthropic.com").success).toBe(true)
    expect(domainPatternSchema.safeParse("api.openai.com").success).toBe(true)
  })

  it("should accept valid wildcard domain", () => {
    expect(domainPatternSchema.safeParse("*.googleapis.com").success).toBe(true)
    expect(domainPatternSchema.safeParse("*.example.com").success).toBe(true)
  })

  it("should reject domain with port", () => {
    expect(domainPatternSchema.safeParse("api.example.com:443").success).toBe(false)
  })

  it("should reject domain with protocol", () => {
    expect(domainPatternSchema.safeParse("https://api.example.com").success).toBe(false)
  })

  it("should reject wildcard in middle of domain", () => {
    expect(domainPatternSchema.safeParse("api.*.example.com").success).toBe(false)
  })

  it("should reject standalone wildcard", () => {
    expect(domainPatternSchema.safeParse("*").success).toBe(false)
  })
})

describe("perstackConfigSchema with skill allowedDomains", () => {
  it("should accept skill-level allowedDomains for mcpStdioSkill", () => {
    const result = perstackConfigSchema.safeParse({
      experts: {
        "my-expert": {
          instruction: "Test instruction",
          skills: {
            exa: {
              type: "mcpStdioSkill",
              command: "npx",
              allowedDomains: ["api.exa.ai", "*.exa.ai"],
            },
          },
        },
      },
    })
    expect(result.success).toBe(true)
  })

  it("should accept skill-level allowedDomains for mcpSseSkill", () => {
    const result = perstackConfigSchema.safeParse({
      experts: {
        "my-expert": {
          instruction: "Test instruction",
          skills: {
            remote: {
              type: "mcpSseSkill",
              endpoint: "https://api.example.com/mcp",
              allowedDomains: ["api.example.com"],
            },
          },
        },
      },
    })
    expect(result.success).toBe(true)
  })

  it("should reject invalid domain pattern in skill allowedDomains", () => {
    const result = perstackConfigSchema.safeParse({
      experts: {
        "my-expert": {
          instruction: "Test instruction",
          skills: {
            exa: {
              type: "mcpStdioSkill",
              command: "npx",
              allowedDomains: ["https://api.exa.ai"],
            },
          },
        },
      },
    })
    expect(result.success).toBe(false)
  })

  it("should accept skill without allowedDomains", () => {
    const result = perstackConfigSchema.safeParse({
      experts: {
        "my-expert": {
          instruction: "Test instruction",
          skills: {
            base: {
              type: "mcpStdioSkill",
              command: "npx",
            },
          },
        },
      },
    })
    expect(result.success).toBe(true)
  })
})
