import type { McpStdioSkill, PerstackConfig } from "@perstack/core"

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
      npmPackages.push(mcpSkill.packageName)
    }
    if (mcpSkill.command === "uvx" && mcpSkill.packageName) {
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

export function generateDockerfile(config: PerstackConfig, expertKey: string): string {
  const runtimes = detectRequiredRuntimes(config, expertKey)
  const lines: string[] = []
  lines.push(generateBaseImageLayers(runtimes))
  lines.push("WORKDIR /app")
  lines.push("")
  const mcpLayers = generateMcpInstallLayers(config, expertKey)
  if (mcpLayers) {
    lines.push(mcpLayers)
  }
  lines.push("RUN npm install -g perstack")
  lines.push("")
  lines.push("COPY perstack.toml /app/perstack.toml")
  lines.push("")
  lines.push(`ENTRYPOINT ["perstack", "run", "--config", "/app/perstack.toml", "${expertKey}"]`)
  lines.push("")
  return lines.join("\n")
}
