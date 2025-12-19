import { execSync } from "node:child_process"
import type { RuntimeInfo } from "@perstack/tui"

function checkCommand(command: string): { available: boolean; version?: string } {
  try {
    const result = execSync(`${command} --version`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 5000,
    })
    const firstLine = result.trim().split("\n")[0]
    return { available: true, version: firstLine }
  } catch {
    return { available: false }
  }
}

export function detectCursor(): RuntimeInfo {
  const result = checkCommand("cursor")
  return { type: "cursor", ...result }
}

export function detectClaudeCode(): RuntimeInfo {
  const result = checkCommand("claude")
  return { type: "claude-code", ...result }
}

export function detectGemini(): RuntimeInfo {
  const result = checkCommand("gemini")
  return { type: "gemini", ...result }
}

export function detectAllRuntimes(): RuntimeInfo[] {
  return [detectCursor(), detectClaudeCode(), detectGemini()]
}

export function getAvailableRuntimes(): RuntimeInfo[] {
  return detectAllRuntimes().filter((r) => r.available)
}
