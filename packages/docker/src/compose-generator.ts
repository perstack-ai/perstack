import type { PerstackConfig } from "@perstack/core"
import { collectAllowedDomains, generateProxyComposeService } from "./proxy-generator.js"

export interface ComposeGeneratorOptions {
  expertKey: string
  runtimeImageName: string
  proxyEnabled: boolean
  networkName: string
  envKeys: string[]
  workspacePath?: string
}

export function generateComposeFile(options: ComposeGeneratorOptions): string {
  const { runtimeImageName, proxyEnabled, networkName, envKeys, workspacePath } = options
  const lines: string[] = []
  lines.push("services:")
  lines.push("  runtime:")
  lines.push(`    image: ${runtimeImageName}`)
  const allEnvKeys = [...envKeys]
  if (proxyEnabled) {
    allEnvKeys.push("HTTP_PROXY=http://proxy:3128")
    allEnvKeys.push("HTTPS_PROXY=http://proxy:3128")
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
  const { generateDockerfile } = require("./dockerfile-generator.js")
  const {
    generateSquidConf,
    generateSquidAllowlistAcl,
    generateProxyDockerfile,
  } = require("./proxy-generator.js")
  const allowedDomains = collectAllowedDomains(config, expertKey)
  const hasAllowlist = allowedDomains.length > 0
  const dockerfile = generateDockerfile(config, expertKey, "/app/runtime")
  let proxyDockerfile: string | null = null
  let proxySquidConf: string | null = null
  let proxyAllowlist: string | null = null
  if (hasAllowlist) {
    proxyDockerfile = generateProxyDockerfile(true)
    proxySquidConf = generateSquidConf(allowedDomains)
    proxyAllowlist = generateSquidAllowlistAcl(allowedDomains)
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
