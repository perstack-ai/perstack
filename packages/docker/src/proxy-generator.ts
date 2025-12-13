import type { PerstackConfig, ProviderTable } from "@perstack/core"

export function getProviderApiDomains(provider?: ProviderTable): string[] {
  if (!provider) return []
  switch (provider.providerName) {
    case "anthropic":
      return ["api.anthropic.com"]
    case "openai":
      return ["api.openai.com"]
    case "google":
      return ["generativelanguage.googleapis.com"]
    case "azure-openai":
      return ["*.openai.azure.com"]
    case "amazon-bedrock":
      return ["*.amazonaws.com"]
    case "google-vertex":
      return ["*.googleapis.com"]
    case "deepseek":
      return ["api.deepseek.com"]
    case "ollama":
      return []
    default:
      return []
  }
}

export function collectSkillAllowedDomains(config: PerstackConfig, expertKey: string): string[] {
  const domains: string[] = []
  const expert = config.experts?.[expertKey]
  if (!expert?.skills) return domains
  for (const skill of Object.values(expert.skills)) {
    if (skill.type === "mcpStdioSkill" || skill.type === "mcpSseSkill") {
      const skillDomains = (skill as { allowedDomains?: string[] }).allowedDomains
      if (skillDomains) {
        domains.push(...skillDomains)
      }
    }
  }
  return domains
}

export function collectAllowedDomains(config: PerstackConfig, expertKey: string): string[] {
  const domains = new Set<string>()
  domains.add("registry.npmjs.org")
  const skillDomains = collectSkillAllowedDomains(config, expertKey)
  for (const domain of skillDomains) {
    domains.add(domain)
  }
  const providerDomains = getProviderApiDomains(config.provider)
  for (const domain of providerDomains) {
    domains.add(domain)
  }
  return Array.from(domains)
}

export function generateSquidAllowlistAcl(domains: string[]): string {
  const wildcards = new Set<string>()
  for (const domain of domains) {
    if (domain.startsWith("*.")) {
      wildcards.add(domain.slice(2))
    }
  }
  const lines: string[] = []
  for (const domain of domains) {
    if (domain.startsWith("*.")) {
      lines.push(`.${domain.slice(2)}`)
    } else {
      const isSubdomainOfWildcard = Array.from(wildcards).some((w) => domain.endsWith(`.${w}`))
      if (!isSubdomainOfWildcard) {
        lines.push(domain)
      }
    }
  }
  return lines.join("\n")
}

export function generateSquidConf(allowedDomains?: string[]): string {
  const lines: string[] = []
  lines.push("http_port 3128")
  lines.push("")
  lines.push("acl SSL_ports port 443")
  lines.push("acl Safe_ports port 80")
  lines.push("acl Safe_ports port 443")
  lines.push("acl CONNECT method CONNECT")
  lines.push("")
  if (allowedDomains && allowedDomains.length > 0) {
    lines.push('acl allowed_domains dstdomain "/etc/squid/allowed_domains.txt"')
    lines.push("")
    lines.push("http_access allow CONNECT SSL_ports allowed_domains")
    lines.push("http_access allow Safe_ports allowed_domains")
  } else {
    lines.push("http_access allow CONNECT SSL_ports")
    lines.push("http_access allow Safe_ports")
  }
  lines.push("http_access deny all")
  lines.push("")
  lines.push("access_log none")
  lines.push("cache_log /dev/null")
  lines.push("")
  return lines.join("\n")
}

export function generateProxyDockerfile(hasAllowlist: boolean): string {
  const lines: string[] = []
  lines.push("FROM debian:bookworm-slim")
  lines.push("")
  lines.push("RUN apt-get update && apt-get install -y --no-install-recommends \\")
  lines.push("    squid \\")
  lines.push("    dnsmasq \\")
  lines.push("    && rm -rf /var/lib/apt/lists/*")
  lines.push("")
  lines.push("COPY squid.conf /etc/squid/squid.conf")
  if (hasAllowlist) {
    lines.push("COPY allowed_domains.txt /etc/squid/allowed_domains.txt")
  }
  lines.push("COPY start.sh /start.sh")
  lines.push("RUN chmod +x /start.sh")
  lines.push("")
  lines.push("EXPOSE 3128 53/udp")
  lines.push("")
  lines.push('CMD ["/start.sh"]')
  lines.push("")
  return lines.join("\n")
}
export function generateProxyStartScript(): string {
  const lines: string[] = []
  lines.push("#!/bin/sh")
  lines.push("dnsmasq --no-daemon --server=8.8.8.8 --server=8.8.4.4 &")
  lines.push("exec squid -N -d 1")
  lines.push("")
  return lines.join("\n")
}

export function generateProxyComposeService(
  internalNetworkName: string,
  externalNetworkName: string,
): string {
  const lines: string[] = []
  lines.push("  proxy:")
  lines.push("    build:")
  lines.push("      context: ./proxy")
  lines.push("      dockerfile: Dockerfile")
  lines.push("    networks:")
  lines.push(`      ${internalNetworkName}:`)
  lines.push("        ipv4_address: 172.28.0.2")
  lines.push(`      ${externalNetworkName}:`)
  lines.push("    restart: unless-stopped")
  return lines.join("\n")
}
