import type { McpStdioSkill, PerstackConfig } from "@perstack/core"

const VALID_PACKAGE_NAME_PATTERN = /^[@a-zA-Z0-9][@a-zA-Z0-9._\-/]*$/
function isValidPackageName(name: string): boolean {
  return VALID_PACKAGE_NAME_PATTERN.test(name) && !name.includes("..")
}
export type RuntimeRequirement = "nodejs" | "python"

export function detectRequiredRuntimes(
  config: PerstackConfig,
  expertKey: string,
): Set<RuntimeRequirement> {
  const runtimes = new Set<RuntimeRequirement>()
  runtimes.add("nodejs")
  const expert = config.experts?.[expertKey]
  if (!expert?.skills) {
    return runtimes
  }
  for (const skill of Object.values(expert.skills)) {
    if (skill.type !== "mcpStdioSkill") continue
    const mcpSkill = skill as McpStdioSkill
    if (mcpSkill.command === "npx" || mcpSkill.command === "node") {
      runtimes.add("nodejs")
    }
    if (
      mcpSkill.command === "uvx" ||
      mcpSkill.command === "python" ||
      mcpSkill.command === "python3"
    ) {
      runtimes.add("python")
    }
  }
  return runtimes
}

export function generateBaseImageLayers(runtimes: Set<RuntimeRequirement>): string {
  const lines: string[] = []
  lines.push("FROM debian:bookworm-slim")
  lines.push("")
  lines.push("RUN apt-get update && apt-get install -y --no-install-recommends \\")
  lines.push("    ca-certificates \\")
  lines.push("    curl \\")
  lines.push("    && rm -rf /var/lib/apt/lists/*")
  lines.push("")
  if (runtimes.has("nodejs")) {
    lines.push("RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \\")
    lines.push("    && apt-get install -y --no-install-recommends nodejs \\")
    lines.push("    && rm -rf /var/lib/apt/lists/*")
    lines.push("")
  }
  if (runtimes.has("python")) {
    lines.push("RUN apt-get update && apt-get install -y --no-install-recommends \\")
    lines.push("    python3 \\")
    lines.push("    python3-pip \\")
    lines.push("    python3-venv \\")
    lines.push("    && rm -rf /var/lib/apt/lists/* \\")
    lines.push("    && pip3 install --break-system-packages uv")
    lines.push("")
  }
  return lines.join("\n")
}

export function generateMcpInstallLayers(config: PerstackConfig, expertKey: string): string {
  const lines: string[] = []
  const expert = config.experts?.[expertKey]
  if (!expert?.skills) {
    return ""
  }
  const npmPackages: string[] = []
  const uvxPackages: string[] = []
  for (const skill of Object.values(expert.skills)) {
    if (skill.type !== "mcpStdioSkill") continue
    const mcpSkill = skill as McpStdioSkill
    if (mcpSkill.command === "npx" && mcpSkill.packageName) {
      if (!isValidPackageName(mcpSkill.packageName)) {
        throw new Error(`Invalid npm package name: ${mcpSkill.packageName}`)
      }
      npmPackages.push(mcpSkill.packageName)
    }
    if (mcpSkill.command === "uvx" && mcpSkill.packageName) {
      if (!isValidPackageName(mcpSkill.packageName)) {
        throw new Error(`Invalid Python package name: ${mcpSkill.packageName}`)
      }
      uvxPackages.push(mcpSkill.packageName)
    }
  }
  if (npmPackages.length > 0) {
    lines.push(`RUN npm install -g ${npmPackages.join(" ")}`)
    lines.push("")
  }
  if (uvxPackages.length > 0) {
    for (const pkg of uvxPackages) {
      lines.push(`RUN uvx --help > /dev/null && uv tool install ${pkg}`)
    }
    lines.push("")
  }
  return lines.join("\n")
}

export function generateDockerfile(
  config: PerstackConfig,
  expertKey: string,
  options?: { proxyEnabled?: boolean },
): string {
  const runtimes = detectRequiredRuntimes(config, expertKey)
  const lines: string[] = []
  lines.push(generateBaseImageLayers(runtimes))
  lines.push("WORKDIR /app")
  lines.push("")
  const mcpLayers = generateMcpInstallLayers(config, expertKey)
  if (mcpLayers) {
    lines.push(mcpLayers)
  }
  lines.push("RUN npm install -g @perstack/runtime")
  lines.push("")
  lines.push("COPY perstack.toml /app/perstack.toml")
  lines.push("")
  if (options?.proxyEnabled) {
    lines.push("ENV PERSTACK_PROXY_URL=http://proxy:3128")
    lines.push("ENV NPM_CONFIG_PROXY=http://proxy:3128")
    lines.push("ENV NPM_CONFIG_HTTPS_PROXY=http://proxy:3128")
    lines.push("")
  }
  lines.push(
    `ENTRYPOINT ["perstack-runtime", "run", "--config", "/app/perstack.toml", ${JSON.stringify(expertKey)}]`,
  )
  lines.push("")
  return lines.join("\n")
}
