import type { PerstackConfig } from "@perstack/core"
import { describe, expect, it } from "vitest"
import {
  collectAllowedDomains,
  collectSkillAllowedDomains,
  generateProxyComposeService,
  generateProxyDockerfile,
  generateSquidAllowlistAcl,
  generateSquidConf,
  getProviderApiDomains,
} from "./proxy-generator.js"

describe("getProviderApiDomains", () => {
  it("should return anthropic domain", () => {
    const domains = getProviderApiDomains({ providerName: "anthropic" })
    expect(domains).toEqual(["api.anthropic.com"])
  })

  it("should return openai domain", () => {
    const domains = getProviderApiDomains({ providerName: "openai" })
    expect(domains).toEqual(["api.openai.com"])
  })

  it("should return google domain", () => {
    const domains = getProviderApiDomains({ providerName: "google" })
    expect(domains).toEqual(["generativelanguage.googleapis.com"])
  })

  it("should return bedrock wildcard", () => {
    const domains = getProviderApiDomains({ providerName: "amazon-bedrock" })
    expect(domains).toEqual(["*.amazonaws.com"])
  })

  it("should return empty for ollama", () => {
    const domains = getProviderApiDomains({ providerName: "ollama" })
    expect(domains).toEqual([])
  })

  it("should return empty for undefined provider", () => {
    const domains = getProviderApiDomains(undefined)
    expect(domains).toEqual([])
  })
})

describe("collectSkillAllowedDomains", () => {
  it("should collect domains from mcpStdioSkill", () => {
    const config: PerstackConfig = {
      experts: {
        "test-expert": {
          instruction: "test",
          skills: {
            exa: {
              type: "mcpStdioSkill",
              command: "npx",
              allowedDomains: ["api.exa.ai", "*.exa.ai"],
            },
          },
        },
      },
    }
    const domains = collectSkillAllowedDomains(config, "test-expert")
    expect(domains).toContain("api.exa.ai")
    expect(domains).toContain("*.exa.ai")
  })

  it("should collect domains from mcpSseSkill", () => {
    const config: PerstackConfig = {
      experts: {
        "test-expert": {
          instruction: "test",
          skills: {
            remote: {
              type: "mcpSseSkill",
              endpoint: "https://api.example.com/mcp",
              allowedDomains: ["api.example.com"],
            },
          },
        },
      },
    }
    const domains = collectSkillAllowedDomains(config, "test-expert")
    expect(domains).toContain("api.example.com")
  })

  it("should not collect from interactiveSkill", () => {
    const config: PerstackConfig = {
      experts: {
        "test-expert": {
          instruction: "test",
          skills: {
            interactive: {
              type: "interactiveSkill",
              tools: {},
            },
          },
        },
      },
    }
    const domains = collectSkillAllowedDomains(config, "test-expert")
    expect(domains).toHaveLength(0)
  })

  it("should collect from multiple skills", () => {
    const config: PerstackConfig = {
      experts: {
        "test-expert": {
          instruction: "test",
          skills: {
            exa: {
              type: "mcpStdioSkill",
              command: "npx",
              allowedDomains: ["api.exa.ai"],
            },
            github: {
              type: "mcpStdioSkill",
              command: "npx",
              allowedDomains: ["api.github.com"],
            },
          },
        },
      },
    }
    const domains = collectSkillAllowedDomains(config, "test-expert")
    expect(domains).toContain("api.exa.ai")
    expect(domains).toContain("api.github.com")
  })

  it("should return empty for skills without allowedDomains", () => {
    const config: PerstackConfig = {
      experts: {
        "test-expert": {
          instruction: "test",
          skills: {
            base: {
              type: "mcpStdioSkill",
              command: "npx",
            },
          },
        },
      },
    }
    const domains = collectSkillAllowedDomains(config, "test-expert")
    expect(domains).toHaveLength(0)
  })
})

describe("collectAllowedDomains", () => {
  it("should collect skill domains and provider domains", () => {
    const config: PerstackConfig = {
      provider: { providerName: "anthropic" },
      experts: {
        "test-expert": {
          instruction: "test",
          skills: {
            exa: {
              type: "mcpStdioSkill",
              command: "npx",
              allowedDomains: ["api.exa.ai"],
            },
          },
        },
      },
    }
    const domains = collectAllowedDomains(config, "test-expert")
    expect(domains).toContain("api.exa.ai")
    expect(domains).toContain("api.anthropic.com")
  })

  it("should deduplicate domains", () => {
    const config: PerstackConfig = {
      provider: { providerName: "anthropic" },
      experts: {
        "test-expert": {
          instruction: "test",
          skills: {
            skill1: {
              type: "mcpStdioSkill",
              command: "npx",
              allowedDomains: ["api.anthropic.com"],
            },
          },
        },
      },
    }
    const domains = collectAllowedDomains(config, "test-expert")
    const anthropicCount = domains.filter((d) => d === "api.anthropic.com").length
    expect(anthropicCount).toBe(1)
  })

  it("should return only provider domains when no skill domains", () => {
    const config: PerstackConfig = {
      provider: { providerName: "openai" },
      experts: {
        "test-expert": {
          instruction: "test",
        },
      },
    }
    const domains = collectAllowedDomains(config, "test-expert")
    expect(domains).toEqual(["api.openai.com"])
  })

  it("should return empty when no provider and no skill domains", () => {
    const config: PerstackConfig = {
      experts: {
        "test-expert": {
          instruction: "test",
        },
      },
    }
    const domains = collectAllowedDomains(config, "test-expert")
    expect(domains).toHaveLength(0)
  })

  it("should collect from multiple skills", () => {
    const config: PerstackConfig = {
      provider: { providerName: "anthropic" },
      experts: {
        "test-expert": {
          instruction: "test",
          skills: {
            skill1: {
              type: "mcpStdioSkill",
              command: "npx",
              allowedDomains: ["api.github.com"],
            },
            skill2: {
              type: "mcpStdioSkill",
              command: "npx",
              allowedDomains: ["httpbin.org"],
            },
          },
        },
      },
    }
    const domains = collectAllowedDomains(config, "test-expert")
    expect(domains).toContain("api.github.com")
    expect(domains).toContain("httpbin.org")
    expect(domains).toContain("api.anthropic.com")
  })
})

describe("generateSquidAllowlistAcl", () => {
  it("should convert exact domains", () => {
    const acl = generateSquidAllowlistAcl(["api.anthropic.com", "api.openai.com"])
    expect(acl).toBe("api.anthropic.com\napi.openai.com")
  })

  it("should convert wildcard domains to squid format", () => {
    const acl = generateSquidAllowlistAcl(["*.googleapis.com", "*.example.com"])
    expect(acl).toBe(".googleapis.com\n.example.com")
  })

  it("should handle mixed domains", () => {
    const acl = generateSquidAllowlistAcl(["api.anthropic.com", "*.googleapis.com"])
    expect(acl).toBe("api.anthropic.com\n.googleapis.com")
  })
})

describe("generateSquidConf", () => {
  it("should generate basic squid config with allowlist", () => {
    const conf = generateSquidConf(["api.anthropic.com"])
    expect(conf).toContain("http_port 3128")
    expect(conf).toContain("acl SSL_ports port 443")
    expect(conf).toContain("acl allowed_domains dstdomain")
    expect(conf).toContain("http_access allow CONNECT SSL_ports allowed_domains")
    expect(conf).toContain("http_access deny all")
  })

  it("should allow all SSL when no allowlist", () => {
    const conf = generateSquidConf(undefined)
    expect(conf).toContain("http_access allow CONNECT SSL_ports")
    expect(conf).not.toContain("allowed_domains")
  })

  it("should allow all SSL with empty allowlist", () => {
    const conf = generateSquidConf([])
    expect(conf).toContain("http_access allow CONNECT SSL_ports")
    expect(conf).not.toContain("allowed_domains")
  })
})

describe("generateProxyDockerfile", () => {
  it("should generate Dockerfile with squid", () => {
    const dockerfile = generateProxyDockerfile(true)
    expect(dockerfile).toContain("FROM debian:bookworm-slim")
    expect(dockerfile).toContain("squid")
    expect(dockerfile).toContain("EXPOSE 3128")
    expect(dockerfile).toContain('CMD ["squid", "-N", "-d", "1"]')
  })

  it("should include allowlist copy when hasAllowlist is true", () => {
    const dockerfile = generateProxyDockerfile(true)
    expect(dockerfile).toContain("COPY allowed_domains.txt")
  })

  it("should not include allowlist copy when hasAllowlist is false", () => {
    const dockerfile = generateProxyDockerfile(false)
    expect(dockerfile).not.toContain("COPY allowed_domains.txt")
  })
})

describe("generateProxyComposeService", () => {
  it("should generate compose service", () => {
    const service = generateProxyComposeService("perstack-net")
    expect(service).toContain("proxy:")
    expect(service).toContain("build:")
    expect(service).toContain("perstack-net")
  })
})
