import type { PerstackConfig } from "@perstack/core"
import { describe, expect, it } from "vitest"
import {
  generateProxyComposeService,
  generateProxyDockerfile,
  generateSquidAllowlistAcl,
  generateSquidConf,
  getEffectiveNetworkConfig,
  mergeNetworkConfig,
} from "./proxy-generator.js"

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
})

describe("getEffectiveNetworkConfig", () => {
  it("should get merged config for expert", () => {
    const config: PerstackConfig = {
      network: { allowedDomains: ["api.anthropic.com"] },
      experts: {
        "test-expert": {
          instruction: "test",
          network: { allowedDomains: ["api.github.com"] },
        },
      },
    }
    const effective = getEffectiveNetworkConfig(config, "test-expert")
    expect(effective.allowedDomains).toContain("api.anthropic.com")
    expect(effective.allowedDomains).toContain("api.github.com")
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
    const dockerfile = generateProxyDockerfile()
    expect(dockerfile).toContain("FROM debian:bookworm-slim")
    expect(dockerfile).toContain("squid")
    expect(dockerfile).toContain("EXPOSE 3128")
    expect(dockerfile).toContain('CMD ["squid", "-N", "-d", "1"]')
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
