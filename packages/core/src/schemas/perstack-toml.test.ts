import { describe, expect, it } from "vitest"
import { networkConfigSchema, perstackConfigSchema } from "./perstack-toml.js"

describe("networkConfigSchema", () => {
  describe("allowedDomains", () => {
    it("should accept valid exact domain", () => {
      const result = networkConfigSchema.safeParse({
        allowedDomains: ["api.anthropic.com", "api.openai.com"],
      })
      expect(result.success).toBe(true)
    })

    it("should accept valid wildcard domain", () => {
      const result = networkConfigSchema.safeParse({
        allowedDomains: ["*.googleapis.com", "*.example.com"],
      })
      expect(result.success).toBe(true)
    })

    it("should accept mixed exact and wildcard domains", () => {
      const result = networkConfigSchema.safeParse({
        allowedDomains: ["api.anthropic.com", "*.googleapis.com"],
      })
      expect(result.success).toBe(true)
    })

    it("should reject domain with port", () => {
      const result = networkConfigSchema.safeParse({
        allowedDomains: ["api.example.com:443"],
      })
      expect(result.success).toBe(false)
    })

    it("should reject domain with protocol", () => {
      const result = networkConfigSchema.safeParse({
        allowedDomains: ["https://api.example.com"],
      })
      expect(result.success).toBe(false)
    })

    it("should reject wildcard in middle of domain", () => {
      const result = networkConfigSchema.safeParse({
        allowedDomains: ["api.*.example.com"],
      })
      expect(result.success).toBe(false)
    })

    it("should reject standalone wildcard", () => {
      const result = networkConfigSchema.safeParse({
        allowedDomains: ["*"],
      })
      expect(result.success).toBe(false)
    })

    it("should accept empty array", () => {
      const result = networkConfigSchema.safeParse({
        allowedDomains: [],
      })
      expect(result.success).toBe(true)
    })

    it("should accept undefined allowedDomains", () => {
      const result = networkConfigSchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })
})

describe("perstackConfigSchema with network", () => {
  it("should accept global network config", () => {
    const result = perstackConfigSchema.safeParse({
      network: {
        allowedDomains: ["api.anthropic.com"],
      },
    })
    expect(result.success).toBe(true)
  })

  it("should accept expert-level network config", () => {
    const result = perstackConfigSchema.safeParse({
      experts: {
        "my-expert": {
          instruction: "Test instruction",
          network: {
            allowedDomains: ["api.github.com"],
          },
        },
      },
    })
    expect(result.success).toBe(true)
  })

  it("should accept both global and expert-level network config", () => {
    const result = perstackConfigSchema.safeParse({
      network: {
        allowedDomains: ["api.anthropic.com"],
      },
      experts: {
        "my-expert": {
          instruction: "Test instruction",
          network: {
            allowedDomains: ["api.github.com"],
          },
        },
      },
    })
    expect(result.success).toBe(true)
  })
})
