import type { PerstackConfig } from "@perstack/core"
import TOML from "smol-toml"
import { generateDockerfile } from "./dockerfile-generator.js"
import { extractRequiredEnvVars } from "./env-resolver.js"
import {
  collectAllowedDomains,
  generateProxyComposeService,
  generateProxyDockerfile,
  generateProxyStartScript,
  generateSquidAllowlistAcl,
  generateSquidConf,
} from "./proxy-generator.js"
export interface ComposeGeneratorOptions {
  expertKey: string
  proxyEnabled: boolean
  networkName: string
  envKeys: string[]
  workspacePath?: string
}
export function generateComposeFile(options: ComposeGeneratorOptions): string {
  const { proxyEnabled, networkName, envKeys, workspacePath } = options
  const internalNetworkName = `${networkName}-internal`
  const lines: string[] = []
  lines.push("services:")
  lines.push("  runtime:")
  lines.push("    build:")
  lines.push("      context: .")
  lines.push("      dockerfile: Dockerfile")
  const allEnvKeys = [...envKeys]
  if (proxyEnabled) {
    allEnvKeys.push("HTTP_PROXY=http://proxy:3128")
    allEnvKeys.push("HTTPS_PROXY=http://proxy:3128")
    allEnvKeys.push("http_proxy=http://proxy:3128")
    allEnvKeys.push("https_proxy=http://proxy:3128")
    allEnvKeys.push("NO_PROXY=localhost,127.0.0.1")
    allEnvKeys.push("no_proxy=localhost,127.0.0.1")
  }
  if (allEnvKeys.length > 0) {
    lines.push("    environment:")
    for (const key of allEnvKeys) {
      lines.push(`      - ${key}`)
    }
  }
  if (workspacePath) {
    lines.push("    volumes:")
    lines.push(`      - ${workspacePath}:/workspace:rw`)
    lines.push("    working_dir: /workspace")
  }
  lines.push("    stdin_open: true")
  lines.push("    tty: true")
  if (proxyEnabled) {
    lines.push("    depends_on:")
    lines.push("      - proxy")
    lines.push("    dns:")
    lines.push("      - 172.28.0.2")
    lines.push("    networks:")
    lines.push(`      ${internalNetworkName}:`)
  } else {
    lines.push("    networks:")
    lines.push(`      - ${networkName}`)
  }
  lines.push("")
  if (proxyEnabled) {
    lines.push(generateProxyComposeService(internalNetworkName, networkName))
    lines.push("")
  }
  lines.push("networks:")
  if (proxyEnabled) {
    lines.push(`  ${internalNetworkName}:`)
    lines.push("    driver: bridge")
    lines.push("    internal: true")
    lines.push("    ipam:")
    lines.push("      config:")
    lines.push("        - subnet: 172.28.0.0/16")
    lines.push(`  ${networkName}:`)
    lines.push("    driver: bridge")
  } else {
    lines.push(`  ${networkName}:`)
    lines.push("    driver: bridge")
  }
  lines.push("")
  return lines.join("\n")
}

export function generateBuildContext(
  config: PerstackConfig,
  expertKey: string,
): {
  dockerfile: string
  configToml: string
  proxyDockerfile: string | null
  proxySquidConf: string | null
  proxyAllowlist: string | null
  proxyStartScript: string | null
  composeFile: string
} {
  const allowedDomains = collectAllowedDomains(config, expertKey)
  const hasAllowlist = allowedDomains.length > 0
  const dockerfile = generateDockerfile(config, expertKey, { proxyEnabled: hasAllowlist })
  const containerConfig = { ...config, runtime: "perstack" }
  const configToml = TOML.stringify(containerConfig as Record<string, unknown>)
  let proxyDockerfileContent: string | null = null
  let proxySquidConf: string | null = null
  let proxyAllowlist: string | null = null
  let proxyStartScript: string | null = null
  if (hasAllowlist) {
    proxyDockerfileContent = generateProxyDockerfile(true)
    proxySquidConf = generateSquidConf(allowedDomains)
    proxyAllowlist = generateSquidAllowlistAcl(allowedDomains)
    proxyStartScript = generateProxyStartScript()
  }
  const envRequirements = extractRequiredEnvVars(config, expertKey)
  const envKeys = envRequirements.map((r) => r.name)
  const composeFile = generateComposeFile({
    expertKey,
    proxyEnabled: hasAllowlist,
    networkName: "perstack-net",
    envKeys,
    workspacePath: "./workspace",
  })
  return {
    dockerfile,
    configToml,
    proxyDockerfile: proxyDockerfileContent,
    proxySquidConf,
    proxyAllowlist,
    proxyStartScript,
    composeFile,
  }
}
