export type BuildOutputLine = {
  stage: "pulling" | "building"
  service: string
  message: string
}

export type ProxyLogEvent = {
  action: "allowed" | "blocked"
  domain: string
  port: number
  reason?: string
}

export function parseBuildOutputLine(line: string): BuildOutputLine | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  let stage: "pulling" | "building" = "building"
  if (trimmed.includes("Pulling") || trimmed.includes("pull")) {
    stage = "pulling"
  }

  const serviceMatch = trimmed.match(/^\s*#\d+\s+\[([^\]]+)\]/)
  const service = serviceMatch?.[1]?.split(" ")[0] ?? "runtime"

  return { stage, service, message: trimmed }
}

export function parseProxyLogLine(line: string): ProxyLogEvent | null {
  const logContent = line.replace(/^[^|]+\|\s*/, "")
  const connectMatch = logContent.match(/CONNECT\s+([^:\s]+):(\d+)/)
  if (!connectMatch) return null

  const domain = connectMatch[1]
  const port = Number.parseInt(connectMatch[2], 10)
  if (!domain || Number.isNaN(port)) return null

  const isBlocked = logContent.includes("TCP_DENIED") || logContent.includes("/403")
  const isAllowed =
    logContent.includes("TCP_TUNNEL") ||
    logContent.includes("HIER_DIRECT") ||
    logContent.includes("/200")

  if (isBlocked) {
    return {
      action: "blocked",
      domain,
      port,
      reason: "Domain not in allowlist",
    }
  }

  if (isAllowed) {
    return {
      action: "allowed",
      domain,
      port,
    }
  }

  return null
}
