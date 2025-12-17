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
  lines.push("FROM node:22-bookworm-slim")
  lines.push("")
  lines.push("RUN apt-get update && apt-get install -y --no-install-recommends \\")
  lines.push("    ca-certificates \\")
  lines.push("    curl \\")
  lines.push("    && rm -rf /var/lib/apt/lists/*")
  lines.push("")
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

export function collectNpmPackages(config: PerstackConfig, expertKey: string): string[] {
  const expert = config.experts?.[expertKey]
  if (!expert?.skills) {
    return []
  }
  const npmPackages: string[] = []
  for (const skill of Object.values(expert.skills)) {
    if (skill.type !== "mcpStdioSkill") continue
    const mcpSkill = skill as McpStdioSkill
    if (mcpSkill.command === "npx" && mcpSkill.packageName) {
      if (!isValidPackageName(mcpSkill.packageName)) {
        throw new Error(`Invalid npm package name: ${mcpSkill.packageName}`)
      }
      npmPackages.push(mcpSkill.packageName)
    }
  }
  return npmPackages
}

export function collectUvxPackages(config: PerstackConfig, expertKey: string): string[] {
  const expert = config.experts?.[expertKey]
  if (!expert?.skills) {
    return []
  }
  const uvxPackages: string[] = []
  for (const skill of Object.values(expert.skills)) {
    if (skill.type !== "mcpStdioSkill") continue
    const mcpSkill = skill as McpStdioSkill
    if (mcpSkill.command === "uvx" && mcpSkill.packageName) {
      if (!isValidPackageName(mcpSkill.packageName)) {
        throw new Error(`Invalid Python package name: ${mcpSkill.packageName}`)
      }
      uvxPackages.push(mcpSkill.packageName)
    }
  }
  return uvxPackages
}

export function generateRuntimeInstallLayers(): string {
  const lines: string[] = []
  // Only install core runtime packages at build time
  // Skill packages (npx/uvx) are installed at runtime via npx/uvx commands
  lines.push("RUN npm install -g @perstack/runtime @perstack/base")
  lines.push("")
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

  // Install only core runtime packages at build time
  // Skill packages are installed at runtime via npx/uvx
  lines.push(generateRuntimeInstallLayers())

  lines.push("RUN groupadd -r perstack && useradd -r -g perstack -d /home/perstack -m perstack")
  lines.push("RUN mkdir -p /workspace && chown -R perstack:perstack /workspace /app")
  lines.push("")
  lines.push("COPY --chown=perstack:perstack perstack.toml /app/perstack.toml")
  lines.push("")
  if (options?.proxyEnabled) {
    lines.push("ENV PERSTACK_PROXY_URL=http://proxy:3128")
    lines.push("ENV NPM_CONFIG_PROXY=http://proxy:3128")
    lines.push("ENV NPM_CONFIG_HTTPS_PROXY=http://proxy:3128")
    lines.push("ENV NODE_OPTIONS=--use-env-proxy")
    lines.push("")
  }
  lines.push("USER perstack")
  lines.push("")
  lines.push("WORKDIR /workspace")
  lines.push("")
  lines.push(
    `ENTRYPOINT ["perstack-runtime", "run", "--config", "/app/perstack.toml", ${JSON.stringify(expertKey)}]`,
  )
  lines.push("")
  return lines.join("\n")
}
