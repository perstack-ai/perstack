import { readFile } from "node:fs/promises"
import path from "node:path"
import { type PerstackConfig, perstackConfigSchema } from "@perstack/core"
import TOML from "smol-toml"

export async function getPerstackConfig(configPath?: string): Promise<PerstackConfig> {
  const configString = await findPerstackConfigString(configPath)
  if (configString === null) {
    throw new Error("perstack.toml not found. Create one or specify --config path.")
  }
  return await parsePerstackConfig(configString)
}

async function findPerstackConfigString(configPath?: string): Promise<string | null> {
  if (configPath) {
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
  return perstackConfigSchema.parse(toml)
}
