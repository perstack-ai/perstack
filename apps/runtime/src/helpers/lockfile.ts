import { readFileSync } from "node:fs"
import path from "node:path"
import {
  type Lockfile,
  type LockfileExpert,
  lockfileSchema,
  parseWithFriendlyError,
} from "@perstack/core"
import TOML from "smol-toml"

export function loadLockfile(lockfilePath: string): Lockfile | null {
  try {
    const content = readFileSync(lockfilePath, "utf-8")
    const parsed = TOML.parse(content)
    return parseWithFriendlyError(lockfileSchema, parsed, "perstack.lock")
  } catch {
    return null
  }
}

export function findLockfile(configPath?: string): string | null {
  if (configPath) {
    const configDir = path.dirname(path.resolve(process.cwd(), configPath))
    return path.join(configDir, "perstack.lock")
  }
  return findLockfileRecursively(process.cwd())
}

function findLockfileRecursively(cwd: string): string | null {
  const lockfilePath = path.resolve(cwd, "perstack.lock")
  try {
    readFileSync(lockfilePath)
    return lockfilePath
  } catch {
    if (cwd === path.parse(cwd).root) {
      return null
    }
    return findLockfileRecursively(path.dirname(cwd))
  }
}

export function getLockfileExpertToolDefinitions(
  lockfileExpert: LockfileExpert,
): Record<
  string,
  { skillName: string; name: string; description?: string; inputSchema: Record<string, unknown> }[]
> {
  const result: Record<
    string,
    {
      skillName: string
      name: string
      description?: string
      inputSchema: Record<string, unknown>
    }[]
  > = {}
  for (const toolDef of lockfileExpert.toolDefinitions) {
    if (!result[toolDef.skillName]) {
      result[toolDef.skillName] = []
    }
    result[toolDef.skillName].push({
      skillName: toolDef.skillName,
      name: toolDef.name,
      description: toolDef.description,
      inputSchema: toolDef.inputSchema,
    })
  }
  return result
}
