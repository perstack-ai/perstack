import type { PerstackConfig } from "@perstack/core"
import { describe, expect, it } from "vitest"
import {
  collectSkillAllowedDomains,
  generateProxyComposeService,
  generateProxyDockerfile,
  generateSquidAllowlistAcl,
  generateSquidConf,
  getEffectiveNetworkConfig,
  getProviderApiDomains,
  mergeNetworkConfig,
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

describe("mergeNetworkConfig", () => {
  it("should merge global and expert domains", () => {
    const global = { allowedDomains: ["api.anthropic.com"] }
    const expert = { allowedDomains: ["api.github.com"] }
    const merged = mergeNetworkConfig(global, expert)
    expect(merged.allowedDomains).toContain("api.anthropic.com")
    expect(merged.allowedDomains).toContain("api.github.com")
  })

  it("should deduplicate domains", () => {
    const global = { allowedDomains: ["api.example.com"] }
    const expert = { allowedDomains: ["api.example.com"] }
    const merged = mergeNetworkConfig(global, expert)
    expect(merged.allowedDomains).toHaveLength(1)
  })

  it("should handle undefined configs", () => {
    const merged = mergeNetworkConfig(undefined, undefined)
    expect(merged.allowedDomains).toBeUndefined()
  })

  it("should handle only global config", () => {
    const global = { allowedDomains: ["api.anthropic.com"] }
    const merged = mergeNetworkConfig(global, undefined)
    expect(merged.allowedDomains).toEqual(["api.anthropic.com"])
  })

  it("should merge skill domains", () => {
    const global = { allowedDomains: ["api.anthropic.com"] }
    const skillDomains = ["api.exa.ai"]
    const merged = mergeNetworkConfig(global, undefined, skillDomains)
    expect(merged.allowedDomains).toContain("api.anthropic.com")
    expect(merged.allowedDomains).toContain("api.exa.ai")
  })

  it("should merge provider domains", () => {
    const providerDomains = ["api.anthropic.com"]
    const merged = mergeNetworkConfig(undefined, undefined, undefined, providerDomains)
    expect(merged.allowedDomains).toContain("api.anthropic.com")
  })

  it("should merge all sources", () => {
    const global = { allowedDomains: ["global.example.com"] }
    const expert = { allowedDomains: ["expert.example.com"] }
    const skillDomains = ["skill.example.com"]
    const providerDomains = ["provider.example.com"]
    const merged = mergeNetworkConfig(global, expert, skillDomains, providerDomains)
    expect(merged.allowedDomains).toContain("global.example.com")
    expect(merged.allowedDomains).toContain("expert.example.com")
    expect(merged.allowedDomains).toContain("skill.example.com")
    expect(merged.allowedDomains).toContain("provider.example.com")
  })
})

describe("getEffectiveNetworkConfig", () => {
  it("should get merged config for expert", () => {
    const config: PerstackConfig = {
      network: { allowedDomains: ["global.example.com"] },
      experts: {
        "test-expert": {
          instruction: "test",
          network: { allowedDomains: ["expert.example.com"] },
        },
      },
    }
    const effective = getEffectiveNetworkConfig(config, "test-expert")
    expect(effective.allowedDomains).toContain("global.example.com")
    expect(effective.allowedDomains).toContain("expert.example.com")
  })

  it("should include skill allowedDomains", () => {
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
          },
        },
      },
    }
    const effective = getEffectiveNetworkConfig(config, "test-expert")
    expect(effective.allowedDomains).toContain("api.exa.ai")
  })

  it("should include provider API domains", () => {
    const config: PerstackConfig = {
      provider: { providerName: "anthropic" },
      experts: {
        "test-expert": {
          instruction: "test",
        },
      },
    }
    const effective = getEffectiveNetworkConfig(config, "test-expert")
    expect(effective.allowedDomains).toContain("api.anthropic.com")
  })

  it("should merge all sources", () => {
    const config: PerstackConfig = {
      provider: { providerName: "anthropic" },
      network: { allowedDomains: ["global.example.com"] },
      experts: {
        "test-expert": {
          instruction: "test",
          network: { allowedDomains: ["expert.example.com"] },
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
    const effective = getEffectiveNetworkConfig(config, "test-expert")
    expect(effective.allowedDomains).toContain("global.example.com")
    expect(effective.allowedDomains).toContain("expert.example.com")
    expect(effective.allowedDomains).toContain("api.exa.ai")
    expect(effective.allowedDomains).toContain("api.anthropic.com")
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
