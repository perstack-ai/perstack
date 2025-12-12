import type { NetworkConfig, PerstackConfig } from "@perstack/core"

export function mergeNetworkConfig(
  globalConfig?: NetworkConfig,
  expertConfig?: NetworkConfig,
): NetworkConfig {
  const allowedDomains = new Set<string>()
  if (globalConfig?.allowedDomains) {
    for (const domain of globalConfig.allowedDomains) {
      allowedDomains.add(domain)
    }
  }
  if (expertConfig?.allowedDomains) {
    for (const domain of expertConfig.allowedDomains) {
      allowedDomains.add(domain)
    }
  }
  return {
    allowedDomains: allowedDomains.size > 0 ? Array.from(allowedDomains) : undefined,
  }
}

export function getEffectiveNetworkConfig(
  config: PerstackConfig,
  expertKey: string,
): NetworkConfig {
  const expert = config.experts?.[expertKey]
  return mergeNetworkConfig(config.network, expert?.network)
}

export function generateSquidAllowlistAcl(domains: string[]): string {
  const lines: string[] = []
  for (const domain of domains) {
    if (domain.startsWith("*.")) {
      lines.push(`.${domain.slice(2)}`)
    } else {
      lines.push(domain)
    }
  }
  return lines.join("\n")
}

export function generateSquidConf(allowedDomains?: string[]): string {
  const lines: string[] = []
  lines.push("http_port 3128")
  lines.push("")
  lines.push("acl SSL_ports port 443")
  lines.push("acl CONNECT method CONNECT")
  lines.push("")
  if (allowedDomains && allowedDomains.length > 0) {
    lines.push('acl allowed_domains dstdomain "/etc/squid/allowed_domains.txt"')
    lines.push("")
    lines.push("http_access allow CONNECT SSL_ports allowed_domains")
  } else {
    lines.push("http_access allow CONNECT SSL_ports")
  }
  lines.push("http_access deny all")
  lines.push("")
  lines.push("access_log stdio:/dev/stdout logformat=squid")
  lines.push("")
  return lines.join("\n")
}

export function generateProxyDockerfile(hasAllowlist: boolean): string {
  const lines: string[] = []
  lines.push("FROM debian:bookworm-slim")
  lines.push("")
  lines.push("RUN apt-get update && apt-get install -y --no-install-recommends \\")
  lines.push("    squid \\")
  lines.push("    && rm -rf /var/lib/apt/lists/*")
  lines.push("")
  lines.push("COPY squid.conf /etc/squid/squid.conf")
  if (hasAllowlist) {
    lines.push("COPY allowed_domains.txt /etc/squid/allowed_domains.txt")
  }
  lines.push("")
  lines.push("EXPOSE 3128")
  lines.push("")
  lines.push('CMD ["squid", "-N", "-d", "1"]')
  lines.push("")
  return lines.join("\n")
}

export function generateProxyComposeService(networkName: string): string {
  const lines: string[] = []
  lines.push("  proxy:")
  lines.push("    build:")
  lines.push("      context: ./proxy")
  lines.push("      dockerfile: Dockerfile")
  lines.push("    networks:")
  lines.push(`      - ${networkName}`)
  lines.push("    restart: unless-stopped")
  return lines.join("\n")
}
