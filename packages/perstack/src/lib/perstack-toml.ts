import { readFile } from "node:fs/promises"
import path from "node:path"
import { type PerstackConfig, parseWithFriendlyError, perstackConfigSchema } from "@perstack/core"
import TOML from "smol-toml"

const ALLOWED_CONFIG_HOSTS = ["raw.githubusercontent.com"]

export async function getPerstackConfig(configPath?: string): Promise<PerstackConfig> {
  const configString = await findPerstackConfigString(configPath)
  if (configString === null) {
    throw new Error("perstack.toml not found. Create one or specify --config path.")
  }
  return await parsePerstackConfig(configString)
}

function isRemoteUrl(configPath: string): boolean {
  const lower = configPath.toLowerCase()
  return lower.startsWith("https://") || lower.startsWith("http://")
}

async function fetchRemoteConfig(url: string): Promise<string> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error(`Invalid remote config URL: ${url}`)
  }
  if (parsed.protocol !== "https:") {
    throw new Error("Remote config requires HTTPS")
  }
  if (!ALLOWED_CONFIG_HOSTS.includes(parsed.hostname)) {
    throw new Error(`Remote config only allowed from: ${ALLOWED_CONFIG_HOSTS.join(", ")}`)
  }
  try {
    const response = await fetch(url, { redirect: "error" })
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`)
    }
    return await response.text()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to fetch remote config: ${message}`)
  }
}

async function findPerstackConfigString(configPath?: string): Promise<string | null> {
  if (configPath) {
    if (isRemoteUrl(configPath)) {
      return await fetchRemoteConfig(configPath)
    }
    try {
      const tomlString = await readFile(path.resolve(process.cwd(), configPath), "utf-8")
      return tomlString
    } catch {
      throw new Error(`Given config path "${configPath}" is not found`)
    }
  }
  return await findPerstackConfigStringRecursively(path.resolve(process.cwd()))
}

async function findPerstackConfigStringRecursively(cwd: string): Promise<string | null> {
  try {
    const tomlString = await readFile(path.resolve(cwd, "perstack.toml"), "utf-8")
    return tomlString
  } catch {
    if (cwd === path.parse(cwd).root) {
      return null
    }
    return await findPerstackConfigStringRecursively(path.dirname(cwd))
  }
}

async function parsePerstackConfig(config: string): Promise<PerstackConfig> {
  const toml = TOML.parse(config ?? "")
  return parseWithFriendlyError(perstackConfigSchema, toml, "perstack.toml")
}
