import { execSync } from "node:child_process"

export function isDockerAvailable(): boolean {
  try {
    execSync("docker info", { stdio: "ignore" })
    return true
  } catch {
    return false
  }
}

export function isCursorAvailable(): boolean {
  try {
    execSync("which cursor-agent", { stdio: "ignore" })
    return true
  } catch {
    return false
  }
}

export function isClaudeAvailable(): boolean {
  try {
    execSync("which claude", { stdio: "ignore" })
    return true
  } catch {
    return false
  }
}

export function isGeminiAvailable(): boolean {
  try {
    execSync("which gemini", { stdio: "ignore" })
    return true
  } catch {
    return false
  }
}
