import type { PerstackConfig } from "@perstack/core"
import { generateProxyComposeService, getEffectiveNetworkConfig } from "./proxy-generator.js"

export interface ComposeGeneratorOptions {
  expertKey: string
  runtimeImageName: string
  proxyEnabled: boolean
  networkName: string
  envKeys: string[]
  workspacePath?: string
}

export function generateComposeFile(options: ComposeGeneratorOptions): string {
  const { expertKey, runtimeImageName, proxyEnabled, networkName, envKeys, workspacePath } = options
  const lines: string[] = []
  lines.push("services:")
  lines.push("  runtime:")
  lines.push(`    image: ${runtimeImageName}`)
  if (envKeys.length > 0) {
    lines.push("    environment:")
    for (const key of envKeys) {
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
    lines.push("    environment:")
    lines.push("      - HTTP_PROXY=http://proxy:3128")
    lines.push("      - HTTPS_PROXY=http://proxy:3128")
  }
  lines.push("    networks:")
  lines.push(`      - ${networkName}`)
  lines.push("")
  if (proxyEnabled) {
    lines.push(generateProxyComposeService(networkName))
    lines.push("")
  }
  lines.push("networks:")
  lines.push(`  ${networkName}:`)
  lines.push("    driver: bridge")
  lines.push("")
  return lines.join("\n")
}

export function generateBuildContext(
  config: PerstackConfig,
  expertKey: string,
): {
  dockerfile: string
  proxyDockerfile: string | null
  proxySquidConf: string | null
  proxyAllowlist: string | null
  composeFile: string
} {
  const { generateDockerfile, detectRequiredRuntimes } = require("./dockerfile-generator.js")
  const {
    generateSquidConf,
    generateSquidAllowlistAcl,
    generateProxyDockerfile,
  } = require("./proxy-generator.js")
  const networkConfig = getEffectiveNetworkConfig(config, expertKey)
  const hasAllowlist = !!(networkConfig.allowedDomains && networkConfig.allowedDomains.length > 0)
  const dockerfile = generateDockerfile(config, expertKey, "/app/runtime")
  let proxyDockerfile: string | null = null
  let proxySquidConf: string | null = null
  let proxyAllowlist: string | null = null
  if (hasAllowlist) {
    proxyDockerfile = generateProxyDockerfile(true)
    proxySquidConf = generateSquidConf(networkConfig.allowedDomains)
    proxyAllowlist = generateSquidAllowlistAcl(networkConfig.allowedDomains!)
  }
  const composeFile = generateComposeFile({
    expertKey,
    runtimeImageName: `perstack-runtime-${expertKey}:latest`,
    proxyEnabled: hasAllowlist,
    networkName: "perstack-net",
    envKeys: [],
    workspacePath: "./workspace",
  })
  return {
    dockerfile,
    proxyDockerfile,
    proxySquidConf,
    proxyAllowlist,
    composeFile,
  }
}
