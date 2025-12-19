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

export function hasOpenAIKey(): boolean {
  return !!process.env.OPENAI_API_KEY
}

export function hasAnthropicKey(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}

export function hasGoogleKey(): boolean {
  return !!process.env.GOOGLE_GENERATIVE_AI_API_KEY
}
